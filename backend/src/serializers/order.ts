import { OrderStatus, PaymentStatus } from '@prisma/client';

/**
 * The single definition of the order shape the frontend consumes.
 *
 * All money is in **paise** and every field is named `*Paise` so a UI can never
 * accidentally render a paise value as rupees (the order-tracking screen used
 * to do exactly that and displayed totals 100x too high).
 */
export interface SerializedOrderItem {
  id: string;
  quantity: number;
  unitPricePaise: number;
  linePricePaise: number;
  variantId: string;
  variantLabel: string | null;
  product: {
    id: string;
    slug: string;
    title: string;
    imageUrl: string | null;
  };
}

export interface SerializedOrder {
  id: string;
  status: OrderStatus;
  paymentMethod: string;
  totalPaise: number;
  createdAt: Date;
  updatedAt: Date;
  items: SerializedOrderItem[];
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
    phone: string;
    email: string | null;
  } | null;
  payment: {
    status: PaymentStatus;
    provider: string;
    providerOrderId: string | null;
    amountPaise: number;
    refundedAmountPaise: number;
    providerRefundId: string | null;
    failureReason: string | null;
  } | null;
  /** True while the customer still needs to complete an online payment. */
  awaitingPayment: boolean;
  /** True when a customer-initiated cancellation is still allowed. */
  cancellable: boolean;
}

const CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAID,
  OrderStatus.CONFIRMED,
];

export function serializeOrder(order: any): SerializedOrder {
  // The most recent payment attempt is the one the UI cares about.
  const payments = [...(order.payments ?? [])].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const payment = payments[0] ?? null;

  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    totalPaise: order.totalAmount,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: (order.items ?? []).map((i: any) => ({
      id: i.id,
      quantity: i.quantity,
      unitPricePaise: i.priceAtPurchase,
      linePricePaise: i.priceAtPurchase * i.quantity,
      variantId: i.variantId,
      variantLabel: i.variant?.label ?? null,
      product: {
        id: i.variant?.product?.id ?? '',
        slug: i.variant?.product?.slug ?? '',
        title: i.variant?.product?.title ?? 'Unknown product',
        imageUrl:
          i.variant?.product?.images?.find((img: any) => img.isPrimary)?.url ??
          i.variant?.product?.images?.[0]?.url ??
          null,
      },
    })),
    shippingAddress: order.address
      ? {
          firstName: order.address.firstName,
          lastName: order.address.lastName,
          addressLine: order.address.addressLine,
          city: order.address.city,
          state: order.address.state,
          pinCode: order.address.pinCode,
          country: order.address.country,
          phone: order.address.phone,
          email: order.address.email ?? null,
        }
      : null,
    payment: payment
      ? {
          status: payment.status,
          provider: payment.provider,
          providerOrderId: payment.providerOrderId ?? null,
          amountPaise: payment.amount,
          refundedAmountPaise: payment.refundedAmount ?? 0,
          providerRefundId: payment.providerRefundId ?? null,
          failureReason: payment.failureReason ?? null,
        }
      : null,
    awaitingPayment:
      order.status === OrderStatus.PENDING && order.paymentMethod !== 'COD',
    cancellable: CANCELLABLE_STATUSES.includes(order.status),
  };
}
