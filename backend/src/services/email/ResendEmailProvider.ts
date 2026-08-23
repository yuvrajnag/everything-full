import { Resend } from 'resend';
import { env, emailConfigured } from '../../config/env';
import {
  EmailProvider,
  EmailProviderError,
  OrderEmailContext,
  PaymentFailedEmailContext,
  RefundEmailContext,
  formatPaise,
} from './EmailProvider';

/**
 * Resend implementation of {@link EmailProvider}.
 *
 * Chosen over SMTP/nodemailer because it needs one API key and no host, port,
 * TLS or pooling configuration — fewer moving parts to get wrong in production.
 *
 * Set `EMAIL_API_KEY` and `EMAIL_FROM_ADDRESS` to enable. When they are absent
 * every method logs loudly and returns without throwing, so an unconfigured
 * mailer can never block a checkout.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'RESEND';

  private client: Resend | null = null;

  get isConfigured(): boolean {
    return emailConfigured;
  }

  private getClient(): Resend {
    if (!this.client) {
      this.client = new Resend(env.email.apiKey);
    }
    return this.client;
  }

  async sendOrderConfirmed(ctx: OrderEmailContext): Promise<void> {
    const ref = shortRef(ctx.orderId);
    await this.send(ctx, `Your EVERYTHING order ${ref} is confirmed`, [
      `Hi ${ctx.customerName || 'there'},`,
      '',
      `Thanks for your order. We've received it and it's being prepared for dispatch.`,
      '',
      `Order:  ${ref}`,
      `Total:  ${formatPaise(ctx.totalPaise)}`,
      '',
      'Items',
      ...renderItems(ctx),
      '',
      ...renderAddress(ctx),
      '',
      'You can track this order from your account.',
      '',
      '— EVERYTHING',
    ]);
  }

  async sendOrderCancelled(ctx: RefundEmailContext): Promise<void> {
    const ref = shortRef(ctx.orderId);
    const refunded = ctx.refundedPaise > 0;
    await this.send(ctx, `Your EVERYTHING order ${ref} has been cancelled`, [
      `Hi ${ctx.customerName || 'there'},`,
      '',
      `Your order ${ref} has been cancelled.`,
      '',
      refunded
        ? `We've issued a refund of ${formatPaise(ctx.refundedPaise)} to your original payment method. It usually appears within 5-7 business days.`
        : `No payment was taken for this order, so there is nothing to refund.`,
      '',
      `Order total was ${formatPaise(ctx.totalPaise)}.`,
      '',
      'Items',
      ...renderItems(ctx),
      '',
      'If this was not you, please contact us straight away.',
      '',
      '— EVERYTHING',
    ]);
  }

  async sendPaymentFailed(ctx: PaymentFailedEmailContext): Promise<void> {
    const ref = shortRef(ctx.orderId);
    await this.send(ctx, `Payment for EVERYTHING order ${ref} didn't go through`, [
      `Hi ${ctx.customerName || 'there'},`,
      '',
      `We couldn't take payment for order ${ref}, so it has not been placed.`,
      '',
      `Reason:  ${ctx.reason}`,
      `Total:   ${formatPaise(ctx.totalPaise)}`,
      '',
      `Nothing has been charged. Your items are held for a short while — you can`,
      `complete payment from your account, or start a new order.`,
      '',
      '— EVERYTHING',
    ]);
  }

  /**
   * Single send path. Never throws: a transactional email failing is worth a
   * loud log line, but it must not surface as a failed checkout or a failed
   * cancellation.
   */
  private async send(ctx: OrderEmailContext, subject: string, lines: string[]): Promise<void> {
    if (!this.isConfigured) {
      console.error(
        `[EMAIL NOT SENT] "${subject}" to ${ctx.email ?? 'unknown'} — EMAIL_API_KEY / ` +
          `EMAIL_FROM_ADDRESS are not configured. See backend/.env.example. ` +
          `(order=${ctx.orderId})`
      );
      return;
    }

    if (!ctx.email) {
      console.error(
        `[EMAIL NOT SENT] "${subject}" — no recipient address on order ${ctx.orderId}.`
      );
      return;
    }

    const text = lines.join('\n');

    try {
      const { error } = await this.getClient().emails.send({
        from: env.email.fromAddress,
        to: ctx.email,
        subject,
        text,
      });

      if (error) {
        throw new EmailProviderError(error.message ?? 'Unknown provider error', error);
      }

      console.log(`[EMAIL SENT] "${subject}" to ${ctx.email} (order=${ctx.orderId})`);
    } catch (err: any) {
      console.error(
        `[EMAIL FAILED] "${subject}" to ${ctx.email} (order=${ctx.orderId}): ` +
          `${err?.message ?? err}`
      );
    }
  }
}

/** Short, customer-facing order reference. */
function shortRef(orderId: string): string {
  return `#${orderId.slice(0, 8).toUpperCase()}`;
}

function renderItems(ctx: OrderEmailContext): string[] {
  if (ctx.items.length === 0) return ['  (no items recorded)'];
  return ctx.items.map(
    (i) =>
      `  ${i.quantity} x ${i.title}${i.variantLabel ? ` (${i.variantLabel})` : ''}` +
      ` — ${formatPaise(i.linePricePaise)}`
  );
}

function renderAddress(ctx: OrderEmailContext): string[] {
  if (!ctx.shippingAddress) return [];
  const a = ctx.shippingAddress;
  return ['Shipping to', `  ${a.addressLine}`, `  ${a.city}, ${a.state} ${a.pinCode}`, `  ${a.country}`];
}

export const emailProvider = new ResendEmailProvider();
