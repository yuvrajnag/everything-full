import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../db';
import { emailProvider } from '../email/ResendEmailProvider';
import type {
  OrderEmailContext,
  PaymentFailedEmailContext,
  RefundEmailContext,
} from '../email/EmailProvider';

/**
 * Shared order-fulfilment logic used by both payment confirmation paths:
 * the browser handshake (`POST /api/orders/:id/pay`) and the Razorpay webhook
 * (`POST /webhooks/razorpay`). Keeping one implementation means the two can
 * never drift on stock accounting, audit logging or email.
 */

export const ORDER_DETAIL_INCLUDE = {
  items: { include: { variant: { include: { product: { include: { images: true } } } } } },
  address: true,
  payments: true,
} satisfies Prisma.OrderInclude;

/** Thrown when another request finalized the order first. */
export class AlreadyFinalizedError extends Error {
  constructor() {
    super('Order already finalized');
    this.name = 'AlreadyFinalizedError';
  }
}

/** Turns a reservation into a real stock decrement. */
export async function commitReservedStock(
  tx: Prisma.TransactionClient,
  items: { variantId: string; quantity: number }[]
): Promise<void> {
  for (const item of items) {
    await tx.inventory.update({
      where: { variantId: item.variantId },
      data: {
        stockCount: { decrement: item.quantity },
        reserved: { decrement: item.quantity },
      },
    });
  }
}

export interface CaptureResult {
  /** The order after the capture, with full detail includes. */
  order: any;
  /**
   * False when the order was already PAID, i.e. this was a duplicate
   * confirmation. Callers use it to avoid sending a second email.
   */
  captured: boolean;
}

/**
 * Marks a verified payment as captured: commits the reserved stock, flips the
 * payment to SUCCESS and the order to PAID, writes an audit row, and sends the
 * confirmation email.
 *
 * Idempotent by design. The order status is re-read *inside* the transaction,
 * so two concurrent confirmations (a browser handshake racing a webhook, or
 * Razorpay redelivering the same event) cannot both decrement stock — the
 * loser sees a non-PENDING status and returns `captured: false`.
 *
 * The caller is responsible for having verified the payment signature first.
 */
export async function capturePayment(params: {
  orderId: string;
  /** Our Payment row id. */
  paymentRowId: string;
  /** Razorpay's payment id (`pay_...`). */
  providerPaymentId: string;
  /** Where the confirmation came from, for the audit trail. */
  source: 'checkout' | 'webhook';
}): Promise<CaptureResult> {
  const { orderId, paymentRowId, providerPaymentId, source } = params;

  let alreadyPaid = false;

  const order = await prisma.$transaction(async (tx) => {
    const fresh = await tx.order.findUnique({
      where: { id: orderId },
      select: { status: true, userId: true },
    });

    if (!fresh) throw new AlreadyFinalizedError();

    if (fresh.status === OrderStatus.PAID) {
      // Duplicate delivery or a race the other side already won.
      alreadyPaid = true;
      return tx.order.findUnique({ where: { id: orderId }, include: ORDER_DETAIL_INCLUDE });
    }

    if (fresh.status !== OrderStatus.PENDING) {
      // CANCELLED, SHIPPED, ... — not something to silently overwrite.
      throw new AlreadyFinalizedError();
    }

    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { variantId: true, quantity: true },
    });
    await commitReservedStock(tx, items);

    await tx.payment.update({
      where: { id: paymentRowId },
      data: {
        status: PaymentStatus.SUCCESS,
        providerPaymentId,
        failureReason: null,
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'PAYMENT_CAPTURED',
        entityType: 'Order',
        entityId: orderId,
        orderId,
        userId: fresh.userId,
        details: JSON.stringify({ providerPaymentId, source }),
      },
    });

    return tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID },
      include: ORDER_DETAIL_INCLUDE,
    });
  });

  if (!alreadyPaid && order) {
    // Sent once, by whichever path captured first. Never awaited into the
    // request's critical path in a way that could fail it — see sendSafely.
    void sendOrderConfirmedEmail(order);
  }

  return { order, captured: !alreadyPaid };
}

/**
 * Records a payment attempt that the provider rejected. Leaves the order
 * PENDING so the customer can retry; the stale-checkout sweep releases the
 * reservation if they never do.
 */
export async function recordPaymentFailure(params: {
  orderId: string;
  reason: string;
  /** Restrict to one payment row when the failure is attributable. */
  paymentRowId?: string;
}): Promise<void> {
  const { orderId, reason, paymentRowId } = params;

  await prisma.payment.updateMany({
    where: paymentRowId
      ? { id: paymentRowId }
      : { orderId, status: PaymentStatus.PENDING },
    data: { status: PaymentStatus.FAILED, failureReason: reason.slice(0, 500) },
  });

  await prisma.auditLog
    .create({
      data: {
        action: 'PAYMENT_FAILED',
        entityType: 'Order',
        entityId: orderId,
        orderId,
        details: JSON.stringify({ reason: reason.slice(0, 500) }),
      },
    })
    .catch(() => {
      // Audit logging must not fail the caller.
    });
}

// ═══════════════════════════════════════════════════════════════════════
// Email triggers — all best-effort, never able to fail the caller
// ═══════════════════════════════════════════════════════════════════════

/** Builds the email context from a fully-included order row. */
export function toEmailContext(order: any): OrderEmailContext {
  const address = order.address ?? null;
  return {
    orderId: order.id,
    email: address?.email ?? order.user?.email ?? null,
    customerName: address ? `${address.firstName} ${address.lastName}`.trim() : '',
    totalPaise: order.totalAmount,
    items: (order.items ?? []).map((i: any) => ({
      title: i.variant?.product?.title ?? 'Item',
      variantLabel: i.variant?.label ?? null,
      quantity: i.quantity,
      linePricePaise: i.priceAtPurchase * i.quantity,
    })),
    shippingAddress: address
      ? {
          addressLine: address.addressLine,
          city: address.city,
          state: address.state,
          pinCode: address.pinCode,
          country: address.country,
        }
      : null,
  };
}

/**
 * Runs an email send without ever letting it reach the caller. An email
 * provider that is down, misconfigured or slow must not turn a successful
 * order into a failed request.
 */
async function sendSafely(label: string, send: () => Promise<void>): Promise<void> {
  try {
    await send();
  } catch (err: any) {
    console.error(`[EMAIL ERROR] ${label}: ${err?.message ?? err}`);
  }
}

export async function sendOrderConfirmedEmail(order: any): Promise<void> {
  await sendSafely(`order confirmed ${order.id}`, () =>
    emailProvider.sendOrderConfirmed(toEmailContext(order))
  );
}

export async function sendOrderCancelledEmail(order: any, refundedPaise: number): Promise<void> {
  const ctx: RefundEmailContext = { ...toEmailContext(order), refundedPaise };
  await sendSafely(`order cancelled ${order.id}`, () => emailProvider.sendOrderCancelled(ctx));
}

export async function sendPaymentFailedEmail(order: any, reason: string): Promise<void> {
  const ctx: PaymentFailedEmailContext = { ...toEmailContext(order), reason };
  await sendSafely(`payment failed ${order.id}`, () => emailProvider.sendPaymentFailed(ctx));
}
