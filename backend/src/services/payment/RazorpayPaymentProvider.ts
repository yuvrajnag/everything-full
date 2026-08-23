import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env, razorpayConfigured } from '../../config/env';
import {
  CreatedProviderOrder,
  PaymentProvider,
  PaymentProviderError,
  RefundResult,
  VerifyPaymentPayload,
} from './PaymentProvider';

/**
 * Razorpay implementation of {@link PaymentProvider}.
 *
 * Amounts are handled throughout in paise, which is also Razorpay's unit for
 * INR, so no conversion happens here.
 *
 * Set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` to test-mode keys (`rzp_test_...`)
 * to exercise this against Razorpay's sandbox.
 */
export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = 'RAZORPAY';

  private client: Razorpay | null = null;

  private getClient(): Razorpay {
    if (!razorpayConfigured) {
      throw new PaymentProviderError(
        'Online payments are not available right now. (Razorpay credentials are not configured.)',
        { providerCode: 'PROVIDER_NOT_CONFIGURED' }
      );
    }
    if (!this.client) {
      this.client = new Razorpay({
        key_id: env.razorpay.keyId,
        key_secret: env.razorpay.keySecret,
      });
    }
    return this.client;
  }

  async createOrder(
    amount: number,
    currency: string,
    receiptId: string
  ): Promise<CreatedProviderOrder> {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new PaymentProviderError(`Invalid payment amount: ${amount}`, {
        providerCode: 'INVALID_AMOUNT',
      });
    }

    try {
      const order = await this.getClient().orders.create({
        amount,
        currency,
        // Razorpay caps the receipt field at 40 characters.
        receipt: receiptId.slice(0, 40),
        payment_capture: true,
      });

      return {
        id: order.id,
        status: String(order.status),
        amount: Number(order.amount),
        currency: String(order.currency),
      };
    } catch (err: any) {
      if (err instanceof PaymentProviderError) throw err;
      throw new PaymentProviderError(describeRazorpayError(err, 'Could not start the payment'), {
        cause: err,
        providerCode: err?.error?.code,
      });
    }
  }

  /**
   * Verifies the checkout handshake signature.
   *
   * Razorpay signs `<razorpay_order_id>|<razorpay_payment_id>` with HMAC-SHA256
   * keyed by the account's key secret and returns it as `razorpay_signature`.
   * Comparison is constant-time so a mismatch leaks no timing information.
   */
  async verifyPayment(payload: VerifyPaymentPayload, signature: string): Promise<boolean> {
    if (!razorpayConfigured) {
      throw new PaymentProviderError(
        'Cannot verify the payment: Razorpay credentials are not configured.',
        { providerCode: 'PROVIDER_NOT_CONFIGURED' }
      );
    }
    if (!payload?.orderId || !payload?.paymentId || !signature) return false;

    const expected = crypto
      .createHmac('sha256', env.razorpay.keySecret)
      .update(`${payload.orderId}|${payload.paymentId}`)
      .digest('hex');

    return timingSafeEqualHex(expected, signature);
  }

  /**
   * Verifies a Razorpay webhook signature (HMAC-SHA256 over the raw request
   * body, keyed by `RAZORPAY_WEBHOOK_SECRET`).
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (!env.razorpay.webhookSecret || !signature) return false;
    const expected = crypto
      .createHmac('sha256', env.razorpay.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return timingSafeEqualHex(expected, signature);
  }

  async refundPayment(paymentId: string, amount?: number): Promise<RefundResult> {
    if (!paymentId) {
      throw new PaymentProviderError('Cannot refund: no provider payment id recorded.', {
        providerCode: 'MISSING_PAYMENT_ID',
      });
    }
    if (amount !== undefined && (!Number.isInteger(amount) || amount <= 0)) {
      throw new PaymentProviderError(`Invalid refund amount: ${amount}`, {
        providerCode: 'INVALID_AMOUNT',
      });
    }

    try {
      const refund = await this.getClient().payments.refund(paymentId, {
        ...(amount !== undefined ? { amount } : {}),
        speed: 'normal',
      });

      return {
        id: refund.id,
        status: String(refund.status),
        amount: Number(refund.amount),
      };
    } catch (err: any) {
      if (err instanceof PaymentProviderError) throw err;
      throw new PaymentProviderError(describeRazorpayError(err, 'The refund was declined'), {
        cause: err,
        providerCode: err?.error?.code,
      });
    }
  }
}

/** Compares two hex digests without leaking their difference through timing. */
function timingSafeEqualHex(expected: string, actual: string): boolean {
  if (typeof actual !== 'string') return false;
  // `timingSafeEqual` throws on length mismatch, which would itself be a leak,
  // so normalise to equal-length buffers first.
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(actual, 'utf8');
  if (a.length !== b.length) {
    // Still burn a comparison so the fast path isn't observably different.
    crypto.timingSafeEqual(a, a);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

/** Turns a Razorpay SDK error into a message that is safe to show a customer. */
function describeRazorpayError(err: any, fallback: string): string {
  const description = err?.error?.description || err?.description;
  if (typeof description === 'string' && description.trim()) {
    return description.trim();
  }
  return `${fallback}. Please try again or use a different payment method.`;
}

export const razorpayProvider = new RazorpayPaymentProvider();
