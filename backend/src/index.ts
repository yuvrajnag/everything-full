import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import { prisma } from './db';
import redis from './lib/redis';
import { RedisStore } from 'rate-limit-redis';
import pino from 'pino';
import pinoHttp from 'pino-http';

const pinoOptions: any = {
  level: process.env.LOG_LEVEL || 'info',
};
if (process.env.NODE_ENV !== 'production') {
  pinoOptions.transport = { target: 'pino-pretty' };
}
const logger = pino(pinoOptions);

dotenv.config();

// ─── Environment validation ────────────────────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.fatal(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const app = express();
const port = process.env.PORT || 5000;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url?.startsWith('/health') || false } }));

// ─── Security middleware ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "https://res.cloudinary.com", "data:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, health checks)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-secret', 'x-user-id', 'x-user-role'],
}));

// Body size limit to prevent payload abuse
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)) as any,
  }),
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// ─── Routes ────────────────────────────────────────────────────────────
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({ status: 'READY', uptime: process.uptime(), timestamp: new Date().toISOString() });
  } catch (err: any) {
    logger.error({ err }, 'Health check failed');
    res.status(503).json({ status: 'DOWN', error: err.message });
  }
});

// ─── 404 handler ───────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Global error handler ──────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled Exception');
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Server lifecycle ──────────────────────────────────────────────────
let autoProgressInterval: ReturnType<typeof setInterval>;

const server = app.listen(port, () => {
  logger.info(`Server running on port ${port} (${process.env.NODE_ENV || 'development'})`);

  // Auto-progress order statuses (simulated logistics)
  autoProgressInterval = setInterval(async () => {
    try {
      const now = new Date();

      // PAID -> SHIPPED (1 min after order creation)
      const oneMinAgo = new Date(now.getTime() - 1 * 60 * 1000);
      await prisma.order.updateMany({
        where: { status: 'PAID', createdAt: { lt: oneMinAgo } },
        data: { status: 'SHIPPED' },
      });

      // SHIPPED -> DELIVERED (5 mins after order creation)
      const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);
      await prisma.order.updateMany({
        where: { status: 'SHIPPED', createdAt: { lt: fiveMinsAgo } },
        data: { status: 'DELIVERED' },
      });
    } catch (e: any) {
      logger.error({ err: e }, 'Auto-progress failed');
    }
  }, 10000);
});

// ─── Graceful shutdown ─────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  clearInterval(autoProgressInterval);
  server.close(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    logger.info('Database disconnected. Server shut down.');
    process.exit(0);
  });
  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.fatal('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
