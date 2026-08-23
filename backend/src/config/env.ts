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
    /** Signs webhook payloads. Set this in the Razorpay dashboard too. */
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },

  email: {
    apiKey: process.env.EMAIL_API_KEY || '',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || '',
  },

  /**
   * Advances PAID/CONFIRMED orders to SHIPPED and then DELIVERED on a timer,
   * with no real dispatch behind it. Useful for local development; on a real
   * store it tells paying customers their order shipped when nothing did, so
   * it is off unless explicitly switched on and never on in production.
   */
  simulateLogistics: process.env.SIMULATE_LOGISTICS === 'true',
} as const;

/** True when Razorpay credentials are present and online payments can be taken. */
export const razorpayConfigured = Boolean(env.razorpay.keyId && env.razorpay.keySecret);

/**
 * True when webhook signatures can be verified. Without this the webhook
 * endpoint rejects every delivery rather than trusting unverified payloads.
 */
export const razorpayWebhooksConfigured = Boolean(env.razorpay.webhookSecret);

/** True when transactional email can actually be sent. */
export const emailConfigured = Boolean(env.email.apiKey && env.email.fromAddress);

if (!razorpayConfigured) {
  console.warn(
    '[WARN] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set. ' +
      'Card and UPI checkout will be rejected with a clear error; ' +
      'Cash on Delivery still works. See backend/.env.example.'
  );
}

if (!razorpayWebhooksConfigured) {
  console.warn(
    '[WARN] RAZORPAY_WEBHOOK_SECRET is not set. POST /webhooks/razorpay will reject ' +
      'every delivery, so payments captured after a customer closes their browser ' +
      'will NOT be reconciled automatically. See backend/.env.example.'
  );
}

if (!emailConfigured) {
  console.warn(
    '[WARN] EMAIL_API_KEY / EMAIL_FROM_ADDRESS are not set. Order confirmation, ' +
      'cancellation and payment-failure emails will be logged but not sent. ' +
      'See backend/.env.example.'
  );
}

if (env.simulateLogistics && isProduction) {
  console.error(
    '[FATAL] SIMULATE_LOGISTICS must not be enabled in production. It marks orders ' +
      'SHIPPED and DELIVERED on a timer without anything actually being dispatched.'
  );
  process.exit(1);
}

if (env.isProduction && env.internalApiKey === 'default-dev-secret') {
  console.error('[FATAL] INTERNAL_API_KEY must not be the development default in production.');
  process.exit(1);
}
