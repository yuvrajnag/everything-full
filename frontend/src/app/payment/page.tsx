import { redirect } from "next/navigation";

/**
 * Legacy route. Payment happens inside Razorpay Checkout on /checkout, or on
 * /pay/[orderId] for an order that still needs paying.
 */
export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  redirect(orderId ? `/pay/${encodeURIComponent(orderId)}` : "/cart");
}
