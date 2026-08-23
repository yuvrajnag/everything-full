import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { OrderStatus, PaymentStatus } from '@prisma/client';

import { prisma } from '../db';
import { razorpayProvider } from '../services/payment/RazorpayPaymentProvider';
import { razorpayWebhooksConfigured } from '../config/env';
import {
  ORDER_DETAIL_INCLUDE,
  AlreadyFinalizedError,
  capturePayment,
  recordPaymentFailure,
  sendPaymentFailedEmail,
} from '../services/orders/fulfillment';

const router = Router();

/**
 * Generous ceiling: Razorpay bursts and retries legitimately, so this exists
 * only to bound abuse from an attacker who cannot produce a valid signature.
 * Deliberately not backed by Redis — a Redis outage must not stop payment
 * reconciliation.
 */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many webhook deliveries' },
});

/**
 * Razorpay webhook receiver.
 *
 * This is the authoritative confirmation path. The browser handshake
 * (`POST /api/orders/:id/pay`) is a latency optimisation — it makes the
 * customer's own tab update immediately — but it cannot be relied on: if the
 * browser is closed, crashes, or loses connectivity between Razorpay capturing
 * the payment and that request completing, only this webhook reconciles the
 * order. Without it such an order sits PENDING until the stale-checkout sweep
 * cancels it, despite the customer having been charged.
 *
 * IMPORTANT: this router must be mounted with `express.raw()`, not
 * `express.json()`. The HMAC is computed over the exact bytes Razorpay sent;
 * re-serialising a parsed object changes key order and whitespace and the
 * signature will never match. See the mount in `index.ts`.
 */

/** Events we act on. Anything else is acknowledged and ignored. */
const HANDLED_EVENTS = ['payment.captured', 'payment.failed', 'refund.processed'] as const;
type HandledEvent = (typeof HANDLED_EVENTS)[number];

router.post('/razorpay', webhookLimiter, async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const deliveryId = (req.headers['x-razorpay-event-id'] as string | undefined) ?? 'unknown';

  // `express.raw()` leaves a Buffer on req.body. Anything else means the route
  // was mounted wrong and the signature cannot be trusted.
  if (!Buffer.isBuffer(req.body)) {
    console.error(
      `[WEBHOOK] delivery=${deliveryId} REJECTED — body is not raw. ` +
        `The /webhooks route must be mounted with express.raw() before express.json().`
    );
    res.status(500).json({ error: 'Webhook receiver misconfigured' });
    return;
  }

  const rawBody: Buffer = req.body;
  const signature = req.headers['x-razorpay-signature'];

  console.log(`[WEBHOOK] delivery=${deliveryId} received ${rawBody.length} bytes`);

  if (!razorpayWebhooksConfigured) {
    // Refuse rather than trust: an unverifiable payload must never move money
    // or stock. Logged at error level because it means captures are not being
    // reconciled.
    console.error(
      `[WEBHOOK] delivery=${deliveryId} REJECTED — RAZORPAY_WEBHOOK_SECRET is not configured.`
    );
    res.status(503).json({ error: 'Webhook processing is not configured' });
    return;
  }

  if (typeof signature !== 'string' || !signature) {
    console.error(`[WEBHOOK] delivery=${deliveryId} REJECTED — missing x-razorpay-signature`);
    res.status(400).json({ error: 'Missing signature' });
    return;
  }

  if (!razorpayProvider.verifyWebhookSignature(rawBody, signature)) {
    console.error(`[WEBHOOK] delivery=${deliveryId} REJECTED — signature verification failed`);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    console.error(`[WEBHOOK] delivery=${deliveryId} REJECTED — body is not valid JSON`);
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const event: string = payload?.event ?? '';
  console.log(`[WEBHOOK] delivery=${deliveryId} verified event=${event}`);

  if (!HANDLED_EVENTS.includes(event as HandledEvent)) {
    // Acknowledge so Razorpay stops retrying an event we deliberately ignore.
    console.log(`[WEBHOOK] delivery=${deliveryId} ignored — ${event} is not handled`);
    res.status(200).json({ received: true, handled: false });
    return;
  }

  try {
    let outcome: string;
    switch (event as HandledEvent) {
      case 'payment.captured':
        outcome = await handlePaymentCaptured(payload, deliveryId);
        break;
      case 'payment.failed':
        outcome = await handlePaymentFailed(payload, deliveryId);
        break;
      case 'refund.processed':
        outcome = await handleRefundProcessed(payload, deliveryId);
        break;
    }

    console.log(
      `[WEBHOOK] delivery=${deliveryId} processed event=${event} outcome=${outcome} ` +
        `in ${Date.now() - startedAt}ms`
    );
    res.status(200).json({ received: true, handled: true });
  } catch (err: any) {
    // A 5xx makes Razorpay retry, which is what we want for a transient
    // failure. The log line is the trail for reconciling a missed payment.
    console.error(
      `[WEBHOOK] delivery=${deliveryId} FAILED event=${event}: ${err?.message ?? err}`,
      err
    );
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// Event handlers
// ═══════════════════════════════════════════════════════════════════════

/**
 * A payment was captured by Razorpay. Reconcile our order to match.
 *
 * Idempotency: `capturePayment` re-reads the order status inside its
 * transaction and short-circuits when it is already PAID, so a redelivered
 * event neither decrements stock twice nor sends a second confirmation email.
 */
async function handlePaymentCaptured(payload: any, deliveryId: string): Promise<string> {
  const entity = payload?.payload?.payment?.entity;
  const providerOrderId: string | undefined = entity?.order_id;
  const providerPaymentId: string | undefined = entity?.id;

  if (!providerOrderId || !providerPaymentId) {
    console.error(`[WEBHOOK] delivery=${deliveryId} payment.captured missing order_id/id`);
    return 'malformed';
  }

  const payment = await prisma.payment.findUnique({
    where: { providerOrderId },
    include: { order: { select: { id: true, status: true } } },
  });

  if (!payment?.order) {
    // Not ours, or the order was never persisted. Acknowledged so Razorpay
    // stops retrying; logged so it can be investigated.
    console.error(
      `[WEBHOOK] delivery=${deliveryId} no local order for providerOrderId=${providerOrderId}`
    );
    return 'order-not-found';
  }

  if (payment.order.status === OrderStatus.PAID) {
    console.log(
      `[WEBHOOK] delivery=${deliveryId} order=${payment.order.id} already PAID — no-op`
    );
    return 'already-paid';
  }

  if (payment.order.status !== OrderStatus.PENDING) {
    // Captured against an order we already cancelled. This is the case that
    // needs a human: the customer has been charged for an order we released.
    console.error(
      `[WEBHOOK] delivery=${deliveryId} order=${payment.order.id} is ` +
        `${payment.order.status} but Razorpay captured payment ${providerPaymentId}. ` +
        `MANUAL REVIEW REQUIRED — the customer may need a refund.`
    );
    return `order-not-payable:${payment.order.status}`;
  }

  try {
    const { captured } = await capturePayment({
      orderId: payment.order.id,
      paymentRowId: payment.id,
      providerPaymentId,
      source: 'webhook',
    });
    console.log(
      `[WEBHOOK] delivery=${deliveryId} order=${payment.order.id} ` +
        `${captured ? 'marked PAID' : 'already PAID (raced)'}`
    );
    return captured ? 'captured' : 'already-paid';
  } catch (err) {
    if (err instanceof AlreadyFinalizedError) {
      console.log(
        `[WEBHOOK] delivery=${deliveryId} order=${payment.order.id} finalized elsewhere — no-op`
      );
      return 'already-finalized';
    }
    throw err;
  }
}

/** A payment attempt was declined. Record it; the order stays retryable. */
async function handlePaymentFailed(payload: any, deliveryId: string): Promise<string> {
  const entity = payload?.payload?.payment?.entity;
  const providerOrderId: string | undefined = entity?.order_id;
  const reason: string =
    entity?.error_description || entity?.error_reason || 'Payment was declined';

  if (!providerOrderId) {
    console.error(`[WEBHOOK] delivery=${deliveryId} payment.failed missing order_id`);
    return 'malformed';
  }

  const payment = await prisma.payment.findUnique({
    where: { providerOrderId },
    include: { order: { include: ORDER_DETAIL_INCLUDE } },
  });

  if (!payment?.order) {
    console.error(
      `[WEBHOOK] delivery=${deliveryId} no local order for providerOrderId=${providerOrderId}`
    );
    return 'order-not-found';
  }

  // Never downgrade an order that actually got paid — a failed attempt can
  // arrive after a successful retry on the same order.
  if (payment.order.status !== OrderStatus.PENDING) {
    console.log(
      `[WEBHOOK] delivery=${deliveryId} order=${payment.order.id} is ` +
        `${payment.order.status}; ignoring late failure`
    );
    return 'not-pending';
  }

  if (payment.status === PaymentStatus.FAILED) {
    console.log(`[WEBHOOK] delivery=${deliveryId} payment already FAILED — no-op`);
    return 'already-failed';
  }

  await recordPaymentFailure({
    orderId: payment.order.id,
    reason,
    paymentRowId: payment.id,
  });

  void sendPaymentFailedEmail(payment.order, reason);

  console.log(`[WEBHOOK] delivery=${deliveryId} order=${payment.order.id} payment marked FAILED`);
  return 'failed-recorded';
}

/**
 * A refund completed. Our own cancellation flow already records refunds it
 * issues, so this mostly reconciles refunds started from the Razorpay
 * dashboard — and acts as a backstop if our write lost a race.
 */
async function handleRefundProcessed(payload: any, deliveryId: string): Promise<string> {
  const entity = payload?.payload?.refund?.entity;
  const refundId: string | undefined = entity?.id;
  const providerPaymentId: string | undefined = entity?.payment_id;
  const amount: number = Number(entity?.amount ?? 0);

  if (!refundId || !providerPaymentId) {
    console.error(`[WEBHOOK] delivery=${deliveryId} refund.processed missing id/payment_id`);
    return 'malformed';
  }

  const payment = await prisma.payment.findUnique({ where: { providerPaymentId } });

  if (!payment) {
    console.error(
      `[WEBHOOK] delivery=${deliveryId} no local payment for providerPaymentId=${providerPaymentId}`
    );
    return 'payment-not-found';
  }

  if (payment.providerRefundId === refundId) {
    console.log(`[WEBHOOK] delivery=${deliveryId} refund ${refundId} already recorded — no-op`);
    return 'already-recorded';
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.REFUNDED,
      providerRefundId: refundId,
      // Accumulate, so a second partial refund doesn't overwrite the first.
      refundedAmount: Math.min(payment.amount, payment.refundedAmount + amount),
    },
  });

  await prisma.auditLog
    .create({
      data: {
        action: 'REFUND_PROCESSED',
        entityType: 'Payment',
        entityId: payment.id,
        orderId: payment.orderId,
        details: JSON.stringify({ refundId, amount, source: 'webhook' }),
      },
    })
    .catch(() => {});

  console.log(
    `[WEBHOOK] delivery=${deliveryId} payment=${payment.id} refund ${refundId} recorded (${amount} paise)`
  );
  return 'refund-recorded';
}

export default router;
