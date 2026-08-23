import { Router, Request, Response } from 'express';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { prisma } from '../db';
import redis, { isRedisHealthy, redisTry } from '../lib/redis';
import { getAuthContext, requireInternalSecret, requireUser } from '../middleware/auth';
import { PaymentProviderError } from '../services/payment/PaymentProvider';
import { razorpayProvider } from '../services/payment/RazorpayPaymentProvider';
import { razorpayConfigured } from '../config/env';
import { serializeOrder } from '../serializers/order';
import {
  ORDER_DETAIL_INCLUDE,
  AlreadyFinalizedError,
  capturePayment,
  commitReservedStock,
  recordPaymentFailure,
  sendOrderCancelledEmail,
  sendOrderConfirmedEmail,
  sendPaymentFailedEmail,
} from '../services/orders/fulfillment';

const router = Router();
const paymentProvider = razorpayProvider;

// ─── Rate limiters ─────────────────────────────────────────────────────
const redisRateStore = () =>
  new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)) as any,
  });

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // Fall back to in-memory counting rather than failing the request outright
  // when Redis is down.
  ...(isRedisHealthy() ? { store: redisRateStore() } : {}),
  message: { error: 'Too many orders created, please try again in a few minutes.', code: 'RATE_LIMITED' },
});

const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  ...(isRedisHealthy() ? { store: redisRateStore() } : {}),
  message: { error: 'Too many requests, please try again in a moment.', code: 'RATE_LIMITED' },
});

// ─── All order routes require the internal secret and a signed-in user ──
router.use(requireInternalSecret);

// ─── Zod schemas ───────────────────────────────────────────────────────
const shippingAddressSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(255),
  firstName: z.string().trim().min(1, 'First name is required.').max(100),
  lastName: z.string().trim().min(1, 'Last name is required.').max(100),
  address: z.string().trim().min(1, 'Address is required.').max(500),
  city: z.string().trim().min(1, 'City is required.').max(100),
  state: z.string().trim().min(1, 'State is required.').max(100),
  pinCode: z.string().trim().regex(/^\d{6}$/, 'PIN code must be 6 digits.'),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone number must be 10 digits.'),
  country: z.string().trim().min(1).max(100),
});

const orderSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().min(1).max(100),
          /** Optional: pins the exact configuration the customer chose. */
          variantId: z.string().min(1).max(100).nullish(),
          quantity: z.number().int().positive().max(10),
        })
      )
      .min(1, 'Your cart is empty.')
      .max(20),
    paymentMethod: z.enum(['card', 'upi', 'cod']),
    shippingAddress: shippingAddressSchema,
    // Client-sent values we explicitly ignore for pricing (defense in depth).
    totalAmount: z.any().optional(),
    priceAtPurchase: z.any().optional(),
  })
  .strict();

const paySchema = z.object({
  razorpay_order_id: z.string().min(1).max(200),
  razorpay_payment_id: z.string().min(1).max(200),
  razorpay_signature: z.string().min(1).max(500),
});

const paymentFailedSchema = z.object({
  /** Customer-safe description from the provider's checkout widget. */
  reason: z.string().max(500).optional(),
  code: z.string().max(100).optional(),
});

const PAYMENT_METHOD_MAP: Record<'card' | 'upi' | 'cod', PaymentMethod> = {
  card: PaymentMethod.CARD,
  upi: PaymentMethod.UPI,
  cod: PaymentMethod.COD,
};

const ORDER_ID_MAX = 50;

/** Statuses from which a customer may still cancel. */
const CANCELLABLE: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.CONFIRMED];

function isValidOrderId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= ORDER_ID_MAX;
}

/**
 * Loads an order and checks the caller is allowed to see it.
 * Returns null after having written the response when access is denied.
 */
async function loadAuthorizedOrder(
  req: Request,
  res: Response,
  include: Prisma.OrderInclude
): Promise<any | null> {
  const orderId: unknown = req.params.id;
  if (!isValidOrderId(orderId)) {
    res.status(400).json({ error: 'Invalid order ID', code: 'INVALID_ORDER_ID' });
    return null;
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include });
  if (!order) {
    res.status(404).json({ error: 'Order not found', code: 'ORDER_NOT_FOUND' });
    return null;
  }

  const { userId, isAdmin } = getAuthContext(req);
  if (!isAdmin && order.userId !== userId) {
    // Don't confirm the order exists to someone who isn't allowed to see it.
    res.status(404).json({ error: 'Order not found', code: 'ORDER_NOT_FOUND' });
    return null;
  }

  return order;
}

// ═══════════════════════════════════════════════════════════════════════
// POST /  — Create order
// ═══════════════════════════════════════════════════════════════════════
router.post('/', requireUser, checkoutLimiter, async (req: Request, res: Response) => {
  const { userId } = getAuthContext(req);

  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: firstZodMessage(parsed.error) ?? 'Please check the details you entered.',
      code: 'INVALID_INPUT',
      details: parsed.error.flatten(),
    });
    return;
  }

  const { items, paymentMethod, shippingAddress } = parsed.data;

  if (paymentMethod !== 'cod' && !razorpayConfigured) {
    res.status(503).json({
      error:
        'Online payments are temporarily unavailable. Please choose Cash on Delivery, or try again later.',
      code: 'PAYMENTS_UNAVAILABLE',
    });
    return;
  }

  // ─── Idempotency: claim the key *before* doing any work ──────────────
  // Two rapid submissions of the same checkout share a key; the loser waits
  // for the winner's order rather than creating a second one.
  const idempotencyKey = readIdempotencyKey(req);
  const idempotencyRedisKey = idempotencyKey ? `idempotency:${userId}:${idempotencyKey}` : null;
  let claimedIdempotency = false;

  if (idempotencyRedisKey) {
    const existing = await resolveIdempotentOrder(idempotencyRedisKey);
    if (existing === 'in-flight') {
      res.status(409).json({
        error: 'This order is already being placed. Please wait a moment.',
        code: 'ORDER_IN_FLIGHT',
      });
      return;
    }
    if (existing) {
      const order = await prisma.order.findUnique({
        where: { id: existing },
        include: ORDER_DETAIL_INCLUDE,
      });
      if (order) {
        res.status(200).json(serializeOrder(order));
        return;
      }
    }
    // `NX` claim: only one concurrent request wins.
    const claim = await redisTry(
      (c) => c.set(idempotencyRedisKey, 'in-flight', 'EX', 24 * 60 * 60, 'NX'),
      null
    );
    if (claim === null && isRedisHealthy()) {
      res.status(409).json({
        error: 'This order is already being placed. Please wait a moment.',
        code: 'ORDER_IN_FLIGHT',
      });
      return;
    }
    claimedIdempotency = true;
  }

  let orderId: string | null = null;

  try {
    // ─── Resolve variants and price the order server-side ──────────────
    const priced = await priceItems(items);
    if ('error' in priced) {
      res.status(priced.status).json(priced.error);
      return;
    }
    const { orderItemsData, calculatedTotal } = priced;

    // ─── Reserve stock + create the order in one transaction ───────────
    const order = await prisma.$transaction(async (tx) => {
      for (const item of orderItemsData) {
        // Conditional UPDATE: the WHERE clause is the stock check, so two
        // concurrent buyers of the last unit cannot both succeed.
        const updated = await tx.$executeRaw`
          UPDATE "Inventory"
          SET "reserved" = "reserved" + ${item.quantity}
          WHERE "variantId" = ${item.variantId}
            AND ("stockCount" - "reserved") >= ${item.quantity}
        `;
        if (updated === 0) {
          throw new OutOfStockError(item.title, item.variantId);
        }
      }

      const address = await tx.address.create({
        data: {
          userId: userId!,
          email: shippingAddress.email,
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          addressLine: shippingAddress.address,
          city: shippingAddress.city,
          state: shippingAddress.state,
          pinCode: shippingAddress.pinCode,
          country: shippingAddress.country,
          phone: shippingAddress.phone,
        },
      });

      return tx.order.create({
        data: {
          totalAmount: calculatedTotal,
          status: OrderStatus.PENDING,
          paymentMethod: PAYMENT_METHOD_MAP[paymentMethod],
          userId: userId!,
          addressId: address.id,
          items: {
            create: orderItemsData.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
              priceAtPurchase: i.priceAtPurchase,
            })),
          },
        },
        include: ORDER_DETAIL_INCLUDE,
      });
    });

    orderId = order.id;

    if (paymentMethod === 'cod') {
      // Cash on Delivery: nothing to charge now. Commit the stock so the units
      // are genuinely allocated, and confirm the order.
      const confirmed = await prisma.$transaction(async (tx) => {
        await commitReservedStock(tx, orderItemsData);
        return tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CONFIRMED },
          include: ORDER_DETAIL_INCLUDE,
        });
      });

      await finishIdempotency(idempotencyRedisKey, claimedIdempotency, order.id);

      // COD never goes through the capture path, so confirm it here.
      void sendOrderConfirmedEmail(confirmed);

      res.status(201).json(serializeOrder(confirmed));
      return;
    }

    // ─── Online payment: open an order with the provider ───────────────
    // If this fails the customer must not be left with a PENDING order
    // silently holding stock, so the reservation is rolled back.
    let providerOrder;
    try {
      providerOrder = await paymentProvider.createOrder(calculatedTotal, 'INR', order.id);
    } catch (err) {
      await releaseOrder(order.id, orderItemsData).catch((e) =>
        console.error('[ERROR] Failed to release stock after payment init failure:', e)
      );
      await clearIdempotency(idempotencyRedisKey, claimedIdempotency);

      const message =
        err instanceof PaymentProviderError
          ? err.message
          : 'We could not start the payment. Please try again.';
      console.error('[ERROR] Payment init failed:', err);
      res.status(502).json({ error: message, code: 'PAYMENT_INIT_FAILED' });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: paymentProvider.name,
        providerOrderId: providerOrder.id,
        amount: calculatedTotal,
        status: PaymentStatus.PENDING,
      },
    });

    await finishIdempotency(idempotencyRedisKey, claimedIdempotency, order.id);

    res.status(201).json({
      ...serializeOrder({ ...order, payments: [payment] }),
      // Everything the browser needs to open the provider's checkout widget.
      payment: {
        provider: paymentProvider.name,
        providerOrderId: providerOrder.id,
        amount: providerOrder.amount,
        currency: providerOrder.currency,
      },
    });
  } catch (error: any) {
    await clearIdempotency(idempotencyRedisKey, claimedIdempotency);

    if (error instanceof OutOfStockError) {
      res.status(409).json({
        error: `${error.productTitle} just sold out or does not have enough stock left. Please adjust your cart and try again.`,
        code: 'OUT_OF_STOCK',
        variantId: error.variantId,
      });
      return;
    }

    console.error('[ERROR] Order creation:', error);
    res.status(500).json({
      error: 'We could not place your order. No payment has been taken — please try again.',
      code: 'ORDER_CREATE_FAILED',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// GET /  — List orders (own orders, or all orders for an admin)
// ═══════════════════════════════════════════════════════════════════════
router.get('/', requireUser, async (req: Request, res: Response) => {
  try {
    const { userId, isAdmin } = getAuthContext(req);
    const where: Prisma.OrderWhereInput = isAdmin ? {} : { userId: userId! };

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: ORDER_DETAIL_INCLUDE,
    });

    res.json(orders.map((o) => serializeOrder(o)));
  } catch (error) {
    console.error('[ERROR] Fetch orders:', error);
    res.status(500).json({ error: 'Could not load your orders.', code: 'ORDERS_FETCH_FAILED' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// GET /:id  — Single order
// ═══════════════════════════════════════════════════════════════════════
router.get('/:id', requireUser, async (req: Request, res: Response) => {
  try {
    const order = await loadAuthorizedOrder(req, res, ORDER_DETAIL_INCLUDE);
    if (!order) return;
    res.json(serializeOrder(order));
  } catch (error) {
    console.error('[ERROR] Fetch order:', error);
    res.status(500).json({ error: 'Could not load this order.', code: 'ORDER_FETCH_FAILED' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// POST /:id/pay  — Verify a completed provider payment
// ═══════════════════════════════════════════════════════════════════════
router.post('/:id/pay', requireUser, actionLimiter, async (req: Request, res: Response) => {
  try {
    const order = await loadAuthorizedOrder(req, res, { items: true, payments: true });
    if (!order) return;

    // Idempotent: replaying the handshake on an already-paid order is a no-op.
    if (order.status === OrderStatus.PAID) {
      const full = await prisma.order.findUnique({
        where: { id: order.id },
        include: ORDER_DETAIL_INCLUDE,
      });
      res.json(serializeOrder(full!));
      return;
    }

    if (order.status !== OrderStatus.PENDING) {
      res.status(409).json({
        error: `This order can no longer be paid for (status: ${order.status}).`,
        code: 'ORDER_NOT_PAYABLE',
      });
      return;
    }

    const parsed = paySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'The payment confirmation was incomplete. If you were charged, contact support and we will resolve it.',
        code: 'INVALID_PAYMENT_PAYLOAD',
      });
      return;
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    const payment = order.payments.find(
      (p: any) => p.providerOrderId === razorpay_order_id
    );
    if (!payment) {
      // The provider order id must belong to *this* order — otherwise a
      // customer could pay ₹1 on one order and replay it against another.
      res.status(400).json({
        error: 'This payment does not belong to this order.',
        code: 'PAYMENT_ORDER_MISMATCH',
      });
      return;
    }

    const valid = await paymentProvider.verifyPayment(
      { orderId: razorpay_order_id, paymentId: razorpay_payment_id },
      razorpay_signature
    );

    if (!valid) {
      await recordPaymentFailure({
        orderId: order.id,
        paymentRowId: payment.id,
        reason: 'Signature verification failed',
      });
      res.status(400).json({
        error: 'We could not verify this payment. Your order has not been charged.',
        code: 'PAYMENT_VERIFICATION_FAILED',
      });
      return;
    }

    // ─── Verified: commit stock, mark paid and email — shared with the
    // webhook path so the two can never diverge. Idempotent: if the webhook
    // already captured this payment, `capturePayment` short-circuits.
    const { order: updated } = await capturePayment({
      orderId: order.id,
      paymentRowId: payment.id,
      providerPaymentId: razorpay_payment_id,
      source: 'checkout',
    });

    res.json(serializeOrder(updated));
  } catch (error) {
    if (error instanceof AlreadyFinalizedError) {
      const full = await prisma.order.findUnique({
        where: { id: String(req.params.id) },
        include: ORDER_DETAIL_INCLUDE,
      });
      if (full) {
        res.json(serializeOrder(full));
        return;
      }
    }
    console.error('[ERROR] Payment verification:', error);
    res.status(500).json({
      error: 'We could not confirm your payment. If you were charged, contact support and we will resolve it.',
      code: 'PAYMENT_CONFIRM_FAILED',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// POST /:id/payment-failed  — Record a declined/abandoned payment
// ═══════════════════════════════════════════════════════════════════════
router.post('/:id/payment-failed', requireUser, actionLimiter, async (req: Request, res: Response) => {
  try {
    const order = await loadAuthorizedOrder(req, res, { items: true, payments: true });
    if (!order) return;

    if (order.status !== OrderStatus.PENDING) {
      res.json({ recorded: false, status: order.status });
      return;
    }

    const parsed = paymentFailedSchema.safeParse(req.body ?? {});
    const reason = (parsed.success && parsed.data.reason) || 'Payment was not completed';

    await recordPaymentFailure({ orderId: order.id, reason });

    const full = await prisma.order.findUnique({
      where: { id: order.id },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (full) void sendPaymentFailedEmail(full, reason);

    // The order stays PENDING so the customer can retry from the order page;
    // the reservation is released by the stale-order sweep if they never do.
    res.json({ recorded: true, status: order.status });
  } catch (error) {
    console.error('[ERROR] Recording payment failure:', error);
    res.status(500).json({ error: 'Could not record the payment failure.', code: 'RECORD_FAILED' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// POST /:id/cancel  — Cancel an order, refunding any captured payment
// ═══════════════════════════════════════════════════════════════════════
router.post('/:id/cancel', requireUser, actionLimiter, async (req: Request, res: Response) => {
  try {
    const order = await loadAuthorizedOrder(req, res, { items: true, payments: true });
    if (!order) return;

    // Idempotent.
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) {
      const full = await prisma.order.findUnique({
        where: { id: order.id },
        include: ORDER_DETAIL_INCLUDE,
      });
      res.json(serializeOrder(full!));
      return;
    }

    if (!CANCELLABLE.includes(order.status)) {
      res.status(409).json({
        error:
          order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED
            ? 'This order has already shipped and can no longer be cancelled. You can start a return instead.'
            : `This order cannot be cancelled (status: ${order.status}).`,
        code: 'ORDER_NOT_CANCELLABLE',
      });
      return;
    }

    // ─── Refund any money we actually took, before cancelling anything ──
    // A captured payment is one that reached SUCCESS and carries a provider
    // payment id. COD orders have no captured payment, so nothing is refunded.
    //
    // Every captured payment is refunded, not just the first: an order should
    // only ever carry one, but if a second one ever appears (a webhook, a
    // manual reconciliation) cancelling while it is still un-refunded would
    // keep the customer's money.
    const capturedPayments = order.payments.filter(
      (p: any) => p.status === PaymentStatus.SUCCESS && p.providerPaymentId
    );

    const refunds: { paymentId: string; id: string; status: string; amount: number }[] = [];

    if (capturedPayments.length > 0) {
      for (const payment of capturedPayments) {
        const outstanding = payment.amount - (payment.refundedAmount ?? 0);
        if (outstanding <= 0) {
          // Already refunded in full; nothing left to return for this payment.
          continue;
        }
        try {
          const result = await paymentProvider.refundPayment(payment.providerPaymentId, outstanding);
          refunds.push({ paymentId: payment.id, ...result });
        } catch (err) {
          // Hard fail: never mark an order cancelled when the customer's money
          // has not actually been returned. Any refund already issued in this
          // loop stays issued and is recorded below on the next attempt, which
          // skips it because its outstanding amount is then zero.
          console.error('[ERROR] Refund failed, cancellation aborted:', err);
          if (refunds.length > 0) {
            await recordRefunds(refunds).catch((e) =>
              console.error('[ERROR] Could not record partial refunds:', e)
            );
          }
          const message =
            err instanceof PaymentProviderError
              ? `We could not issue your refund: ${err.message} Your order has not been cancelled — please try again or contact support.`
              : 'We could not issue your refund, so the order has not been cancelled. Please try again or contact support.';
          res.status(502).json({ error: message, code: 'REFUND_FAILED' });
          return;
        }
      }
    } else if (order.status === OrderStatus.PAID) {
      // The order says PAID but no captured payment is on file. Cancelling here
      // would silently swallow a real charge, so refuse and surface it.
      console.error(`[ERROR] Order ${order.id} is PAID with no captured payment record.`);
      res.status(409).json({
        error:
          'We could not locate the payment for this order, so it cannot be cancelled automatically. Please contact support and we will sort it out.',
        code: 'PAYMENT_RECORD_MISSING',
      });
      return;
    }

    // ─── Money is back: release stock and cancel ────────────────────────
    const updated = await prisma.$transaction(async (tx) => {
      const fresh = await tx.order.findUnique({
        where: { id: order.id },
        select: { status: true },
      });
      if (!fresh || !CANCELLABLE.includes(fresh.status)) {
        throw new AlreadyFinalizedError();
      }

      for (const item of order.items) {
        if (fresh.status === OrderStatus.PENDING) {
          // Never charged: the units are still only reserved.
          await tx.inventory.update({
            where: { variantId: item.variantId },
            data: { reserved: { decrement: item.quantity } },
          });
        } else {
          // Paid or COD-confirmed: stock was committed, so put it back.
          await tx.inventory.update({
            where: { variantId: item.variantId },
            data: { stockCount: { increment: item.quantity } },
          });
        }
      }

      for (const refund of refunds) {
        await tx.payment.update({
          where: { id: refund.paymentId },
          data: {
            status: PaymentStatus.REFUNDED,
            providerRefundId: refund.id,
            refundedAmount: refund.amount,
          },
        });
      }

      // Any payment that never completed is closed out as failed.
      await tx.payment.updateMany({
        where: { orderId: order.id, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.FAILED, failureReason: 'Order cancelled before payment' },
      });

      await tx.auditLog.create({
        data: {
          action: 'ORDER_CANCELLED',
          entityType: 'Order',
          entityId: order.id,
          orderId: order.id,
          userId: order.userId,
          details: JSON.stringify({
            previousStatus: fresh.status,
            refundIds: refunds.map((r) => r.id),
            refundedAmount: refunds.reduce((sum, r) => sum + r.amount, 0),
          }),
        },
      });

      return tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
        include: ORDER_DETAIL_INCLUDE,
      });
    });

    const refundedTotal = refunds.reduce((sum, r) => sum + r.amount, 0);

    void sendOrderCancelledEmail(updated, refundedTotal);

    res.json({
      ...serializeOrder(updated),
      refund:
        refunds.length > 0
          ? { id: refunds[0]!.id, status: refunds[0]!.status, amount: refundedTotal }
          : null,
    });
  } catch (error) {
    if (error instanceof AlreadyFinalizedError) {
      res.status(409).json({
        error: 'This order was just updated elsewhere. Refresh to see its current status.',
        code: 'ORDER_CHANGED',
      });
      return;
    }
    console.error('[ERROR] Cancel order:', error);
    res.status(500).json({ error: 'Could not cancel this order.', code: 'ORDER_CANCEL_FAILED' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

class OutOfStockError extends Error {
  constructor(readonly productTitle: string, readonly variantId: string) {
    super(`Not enough stock for ${productTitle}`);
    this.name = 'OutOfStockError';
  }
}

interface PricedItem {
  variantId: string;
  quantity: number;
  priceAtPurchase: number;
  title: string;
}

/**
 * Resolves each requested item to a concrete variant and prices it from the
 * database. Client-sent prices are never trusted.
 */
async function priceItems(
  items: { productId: string; variantId?: string | null | undefined; quantity: number }[]
): Promise<{ orderItemsData: PricedItem[]; calculatedTotal: number } | { status: number; error: any }> {
  const orderItemsData: PricedItem[] = [];
  let calculatedTotal = 0;

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { variants: { orderBy: { price: 'asc' } } },
    });

    if (!product || product.variants.length === 0) {
      return {
        status: 400,
        error: {
          error: 'One of the items in your cart is no longer available. Please remove it and try again.',
          code: 'PRODUCT_UNAVAILABLE',
          productId: item.productId,
        },
      };
    }

    let variant = item.variantId
      ? product.variants.find((v) => v.id === item.variantId)
      : product.variants.find((v) => v.isDefault) ?? product.variants[0];

    if (!variant) {
      return {
        status: 400,
        error: {
          error: `The selected option for ${product.title} is no longer available. Please pick another and try again.`,
          code: 'VARIANT_UNAVAILABLE',
          productId: item.productId,
        },
      };
    }

    calculatedTotal += variant.price * item.quantity;
    orderItemsData.push({
      variantId: variant.id,
      quantity: item.quantity,
      priceAtPurchase: variant.price,
      title: variant.label ? `${product.title} (${variant.label})` : product.title,
    });
  }

  // Two lines of the same variant would each pass the stock check
  // independently; merge them so the reservation is checked against the total.
  const merged = new Map<string, PricedItem>();
  for (const item of orderItemsData) {
    const existing = merged.get(item.variantId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.set(item.variantId, { ...item });
    }
  }

  return { orderItemsData: [...merged.values()], calculatedTotal };
}

/**
 * Persists refunds that were genuinely issued, even though the cancellation as
 * a whole is being aborted. Without this the provider would hold a refund we
 * have no record of, and a retry would try to issue it a second time.
 */
async function recordRefunds(
  refunds: { paymentId: string; id: string; amount: number }[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const refund of refunds) {
      await tx.payment.update({
        where: { id: refund.paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
          providerRefundId: refund.id,
          refundedAmount: refund.amount,
        },
      });
    }
  });
}

/** Rolls back a reservation and voids the order after a failed payment init. */
async function releaseOrder(orderId: string, items: { variantId: string; quantity: number }[]) {
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.inventory.update({
        where: { variantId: item.variantId },
        data: { reserved: { decrement: item.quantity } },
      });
    }
    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });
  });
}

function readIdempotencyKey(req: Request): string | null {
  const raw = req.headers['x-idempotency-key'];
  if (typeof raw !== 'string') return null;
  const key = raw.trim();
  // Bound the key so it cannot be used to write arbitrarily large Redis keys.
  if (!key || key.length > 100 || !/^[A-Za-z0-9._:-]+$/.test(key)) return null;
  return key;
}

async function resolveIdempotentOrder(key: string): Promise<string | 'in-flight' | null> {
  const value = await redisTry((c) => c.get(key), null);
  if (!value) return null;
  return value === 'in-flight' ? 'in-flight' : value;
}

async function finishIdempotency(key: string | null, claimed: boolean, orderId: string) {
  if (!key || !claimed) return;
  await redisTry((c) => c.setex(key, 24 * 60 * 60, orderId), null);
}

async function clearIdempotency(key: string | null, claimed: boolean) {
  if (!key || !claimed) return;
  await redisTry((c) => c.del(key), null);
}

/** Pulls the first human-readable message out of a Zod error. */
function firstZodMessage(error: z.ZodError): string | null {
  const issue = error.issues[0];
  if (!issue) return null;
  return issue.message;
}

export default router;
