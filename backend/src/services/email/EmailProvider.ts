/**
 * Transactional email for order lifecycle events.
 *
 * Every method is fire-and-forget from the caller's perspective: a missing or
 * broken email provider must never stop an order from completing. Implementations
 * are expected to swallow their own errors and log them; see `sendSafely`.
 */

export interface OrderEmailLine {
  title: string;
  variantLabel: string | null;
  quantity: number;
  /** Line total in paise. */
  linePricePaise: number;
}

export interface OrderEmailContext {
  orderId: string;
  /** Recipient. Emails are skipped when this is missing. */
  email: string | null;
  customerName: string;
  /** Order total in paise. */
  totalPaise: number;
  items: OrderEmailLine[];
  shippingAddress: {
    addressLine: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
  } | null;
}

export interface RefundEmailContext extends OrderEmailContext {
  /** Amount actually refunded, in paise. Zero for orders never charged (COD). */
  refundedPaise: number;
}

export interface PaymentFailedEmailContext extends OrderEmailContext {
  /** Customer-safe reason from the payment provider. */
  reason: string;
}

export interface EmailProvider {
  /** Human-readable provider name, for logs. */
  readonly name: string;

  /** True when credentials are present and mail can actually be sent. */
  readonly isConfigured: boolean;

  /** Sent when an order transitions to PAID (online) or CONFIRMED (COD). */
  sendOrderConfirmed(ctx: OrderEmailContext): Promise<void>;

  /** Sent when an order is cancelled, whether or not a refund was issued. */
  sendOrderCancelled(ctx: RefundEmailContext): Promise<void>;

  /** Sent when a payment attempt is declined or abandoned. */
  sendPaymentFailed(ctx: PaymentFailedEmailContext): Promise<void>;
}

/** Raised internally by implementations; never propagated to a request. */
export class EmailProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'EmailProviderError';
  }
}

/** Formats a paise amount for display inside an email body. */
export function formatPaise(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}
