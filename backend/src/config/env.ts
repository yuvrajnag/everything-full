/**
 * Loads and validates environment configuration.
 *
 * This module MUST be imported before any module that reads `process.env` at
 * import time (`db.ts`, `lib/redis.ts`, the payment provider, ...). Previously
 * `dotenv.config()` ran in `index.ts` *after* those imports had already been
 * evaluated, so values from `.env` never reached them.
 */
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

/** Env vars without which the server cannot serve a single request. */
const REQUIRED = ['DATABASE_URL'] as const;

/** Env vars required only in production, where a fallback would be unsafe. */
const REQUIRED_IN_PRODUCTION = ['INTERNAL_API_KEY', 'ALLOWED_ORIGINS'] as const;

const missing: string[] = [];
for (const key of REQUIRED) {
  if (!process.env[key]) missing.push(key);
}
if (isProduction) {
  for (const key of REQUIRED_IN_PRODUCTION) {
    if (!process.env[key]) missing.push(key);
  }
}

if (missing.length > 0) {
  // Logging is not wired up yet at this point, so write straight to stderr.
  console.error(
    `[FATAL] Missing required environment variable(s): ${missing.join(', ')}. ` +
      `See backend/.env.example.`
  );
  process.exit(1);
}

export const env = {
  isProduction,
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  logLevel: process.env.LOG_LEVEL || 'info',

  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL || '',

  internalApiKey: process.env.INTERNAL_API_KEY || 'default-dev-secret',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    /** Optional: only needed if you wire up Razorpay webhooks. */
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
} as const;

/** True when Razorpay credentials are present and online payments can be taken. */
export const razorpayConfigured = Boolean(env.razorpay.keyId && env.razorpay.keySecret);

if (!razorpayConfigured) {
  console.warn(
    '[WARN] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set. ' +
      'Card and UPI checkout will be rejected with a clear error; ' +
      'Cash on Delivery still works. See backend/.env.example.'
  );
}

if (env.isProduction && env.internalApiKey === 'default-dev-secret') {
  console.error('[FATAL] INTERNAL_API_KEY must not be the development default in production.');
  process.exit(1);
}
