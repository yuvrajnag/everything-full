/**
 * Loads Razorpay Checkout on demand and opens it.
 *
 * Card and UPI details are entered inside Razorpay's own iframe, so no card
 * number, expiry or CVV ever touches this application. (The old checkout
 * collected all three and persisted them to `localStorage`.)
 */

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: any) => void) => void };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Not in a browser'));
  if (window.Razorpay) return Promise.resolve();

  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SCRIPT}"]`);
      const script = existing ?? document.createElement('script');
      script.src = CHECKOUT_SCRIPT;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null; // allow a retry
        reject(new Error('Could not load the payment window. Check your connection and try again.'));
      };
      if (!existing) document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export interface RazorpayHandshake {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface OpenCheckoutArgs {
  /** Razorpay order id from the backend (`payment.providerOrderId`). */
  providerOrderId: string;
  /** Amount in paise, for display inside the widget. */
  amountPaise: number;
  currency: string;
  /** Our own order id, shown in the Razorpay dashboard. */
  orderId: string;
  customer: { name: string; email: string; contact: string };
  method?: 'card' | 'upi';
}

export type CheckoutOutcome =
  | { kind: 'success'; handshake: RazorpayHandshake }
  | { kind: 'dismissed' }
  | { kind: 'failed'; message: string; code?: string };

/**
 * Opens Razorpay Checkout and resolves once the customer succeeds, fails or
 * closes the window. It never rejects for a payment outcome — only for a
 * genuine setup problem (missing key, script blocked).
 */
export async function openRazorpayCheckout(args: OpenCheckoutArgs): Promise<CheckoutOutcome> {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new Error(
      'Online payments are not configured for this store yet. Please choose Cash on Delivery.'
    );
  }

  await loadCheckoutScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) {
    throw new Error('Could not load the payment window. Check your connection and try again.');
  }

  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    const settle = (outcome: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const rzp = new Razorpay({
      key: keyId,
      order_id: args.providerOrderId,
      amount: args.amountPaise,
      currency: args.currency,
      name: 'EVERYTHING',
      description: `Order ${args.orderId.slice(0, 8).toUpperCase()}`,
      image: '/logos/favicon.png',
      prefill: {
        name: args.customer.name,
        email: args.customer.email,
        contact: args.customer.contact,
      },
      notes: { orderId: args.orderId },
      theme: { color: '#FF003C' },
      ...(args.method ? { method: { [args.method]: true } } : {}),
      handler: (response: RazorpayHandshake) => settle({ kind: 'success', handshake: response }),
      modal: {
        ondismiss: () => settle({ kind: 'dismissed' }),
      },
    });

    rzp.on('payment.failed', (response: any) => {
      settle({
        kind: 'failed',
        message:
          response?.error?.description ||
          'Your payment was declined. No money has been taken — please try another method.',
        code: response?.error?.code,
      });
    });

    rzp.open();
  });
}
