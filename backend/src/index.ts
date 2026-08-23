// Environment must be loaded before anything that reads process.env at import
// time (db, redis, payment provider).
import { env } from './config/env';

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { RedisStore } from 'rate-limit-redis';
import { OrderStatus, PaymentStatus } from '@prisma/client';

import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import { prisma } from './db';
import redis, { isRedisHealthy } from './lib/redis';

const pinoOptions: any = { level: env.logLevel };
if (!env.isProduction) {
  pinoOptions.transport = { target: 'pino-pretty' };
}
const logger = pino(pinoOptions);

const app = express();

app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url?.startsWith('/health') || false },
    // Never log the internal secret or auth headers.
    redact: ['req.headers["x-internal-secret"]', 'req.headers.authorization', 'req.headers.cookie'],
  })
);

// ─── Security middleware ───────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'https://res.cloudinary.com', 'data:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests with no origin are server-to-server (the Next.js proxy) or
      // health checks.
      if (!origin || env.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-internal-secret',
      'x-user-id',
      'x-user-role',
      'x-idempotency-key',
    ],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  // Only back the limiter with Redis when Redis is actually up, otherwise a
  // Redis outage takes the whole store down.
  ...(isRedisHealthy()
    ? {
        store: new RedisStore({
          sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)) as any,
        }),
      }
    : {}),
  message: { error: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
});
app.use(globalLimiter);

// ─── Routes ────────────────────────────────────────────────────────────
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {};
  let ready = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (err: any) {
    checks.database = err.message;
    ready = false; // The database is the only hard dependency.
  }

  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch (err: any) {
    // Degraded, not down: caching and rate limiting fall back to local state.
    checks.redis = `degraded: ${err.message}`;
  }

  res.status(ready ? 200 : 503).json({
    status: ready ? 'READY' : 'DOWN',
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 handler ───────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
});

// ─── Global error handler ──────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled Exception');
  res.status(500).json({
    error: env.isProduction ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  });
});

// ─── Background jobs ───────────────────────────────────────────────────
/**
 * Simulated logistics. Timings are deliberately long enough that a customer
 * has a realistic window to cancel — the previous 1-minute PAID -> SHIPPED
 * hop made almost every order non-cancellable before the customer could act.
 */
const SHIP_AFTER_MS = 60 * 60 * 1000; // 1 hour
const DELIVER_AFTER_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/** Checkouts abandoned this long ago release their reserved stock. */
const RESERVATION_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function progressOrders() {
  const now = Date.now();

  await prisma.order.updateMany({
    where: {
      status: { in: [OrderStatus.PAID, OrderStatus.CONFIRMED] },
      updatedAt: { lt: new Date(now - SHIP_AFTER_MS) },
    },
    data: { status: OrderStatus.SHIPPED },
  });

  await prisma.order.updateMany({
    where: {
      status: OrderStatus.SHIPPED,
      updatedAt: { lt: new Date(now - DELIVER_AFTER_MS) },
    },
    data: { status: OrderStatus.DELIVERED },
  });
}

/**
 * Releases inventory held by checkouts the customer never completed.
 * Without this, every abandoned card/UPI checkout permanently removed those
 * units from sale.
 */
async function releaseStaleReservations() {
  const cutoff = new Date(Date.now() - RESERVATION_TTL_MS);

  const stale = await prisma.order.findMany({
    where: { status: OrderStatus.PENDING, createdAt: { lt: cutoff } },
    include: { items: true },
    take: 50,
  });

  for (const order of stale) {
    try {
      await prisma.$transaction(async (tx) => {
        // Re-check inside the transaction: the customer may have just paid.
        const fresh = await tx.order.findUnique({
          where: { id: order.id },
          select: { status: true },
        });
        if (fresh?.status !== OrderStatus.PENDING) return;

        for (const item of order.items) {
          await tx.inventory.update({
            where: { variantId: item.variantId },
            data: { reserved: { decrement: item.quantity } },
          });
        }

        await tx.payment.updateMany({
          where: { orderId: order.id, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.FAILED, failureReason: 'Checkout abandoned' },
        });

        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED },
        });
      });
      logger.info({ orderId: order.id }, 'Released stock from abandoned checkout');
    } catch (err) {
      logger.error({ err, orderId: order.id }, 'Failed to release stale reservation');
    }
  }
}

// ─── Server lifecycle ──────────────────────────────────────────────────
let backgroundInterval: ReturnType<typeof setInterval>;

const server = app.listen(env.port, () => {
  logger.info(`Server running on port ${env.port} (${env.nodeEnv})`);

  backgroundInterval = setInterval(async () => {
    try {
      await progressOrders();
      await releaseStaleReservations();
    } catch (e: any) {
      logger.error({ err: e }, 'Background job failed');
    }
  }, 60_000);
});

// ─── Graceful shutdown ─────────────────────────────────────────────────
let shuttingDown = false;

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Received ${signal}. Shutting down gracefully...`);
  clearInterval(backgroundInterval);

  const forceExit = setTimeout(() => {
    logger.fatal('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async () => {
    try {
      await prisma.$disconnect();
      redis.disconnect();
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
    }
    logger.info('Database disconnected. Server shut down.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

export default app;
