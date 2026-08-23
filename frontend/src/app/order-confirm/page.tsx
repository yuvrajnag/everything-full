import { redirect } from "next/navigation";

/**
 * Legacy route. Order confirmation lives on the tracking page, which is where
 * checkout sends the customer; this used to render an empty "Minimal UI
 * scaffold" placeholder that a customer could land on.
 */
export default async function OrderConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  redirect(id ? `/track?id=${encodeURIComponent(id)}` : "/profile");
}
