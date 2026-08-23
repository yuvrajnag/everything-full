export interface CreatedProviderOrder {
  /** Provider-side order id (Razorpay: `order_...`). */
  id: string;
  status: string;
  /** Amount in the smallest currency unit (paise for INR). */
  amount: number;
  currency: string;
}

export interface VerifyPaymentPayload {
  /** Provider order id previously returned by `createOrder`. */
  orderId: string;
  /** Provider payment id produced by the customer's payment attempt. */
  paymentId: string;
}

export interface RefundResult {
  /** Provider-side refund id (Razorpay: `rfnd_...`). */
  id: string;
  status: string;
  /** Amount refunded, in the smallest currency unit. */
  amount: number;
}

export interface PaymentProvider {
  /** Human-readable provider name, persisted on the Payment row. */
  readonly name: string;

  /**
   * Initializes a payment intent/order on the provider's side.
   * @param amount Amount in the smallest currency unit (paise for INR).
   */
  createOrder(amount: number, currency: string, receiptId: string): Promise<CreatedProviderOrder>;

  /**
   * Verifies that `signature` genuinely came from the provider for `payload`.
   * Implementations must use a constant-time comparison.
   */
  verifyPayment(payload: VerifyPaymentPayload, signature: string): Promise<boolean>;

  /**
   * Processes a refund against a captured payment.
   * Throws if the provider rejects the refund — callers must not treat a
   * thrown error as "refunded".
   * @param amount Amount in the smallest currency unit. Omit for a full refund.
   */
  refundPayment(paymentId: string, amount?: number): Promise<RefundResult>;
}

/** Raised when the payment provider rejects or cannot complete an operation. */
export class PaymentProviderError extends Error {
  readonly cause: unknown;
  readonly providerCode: string | undefined;

  constructor(message: string, options?: { cause?: unknown; providerCode?: string }) {
    super(message);
    this.name = 'PaymentProviderError';
    this.cause = options?.cause;
    this.providerCode = options?.providerCode;
  }
}
