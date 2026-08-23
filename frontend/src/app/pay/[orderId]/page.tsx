"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, CreditCard, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { apiFetch, ApiError, errorMessage } from "@/lib/api";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { formatPaise } from "@/lib/format";

/** A payment link stays usable for this long after the order was created. */
const LINK_TTL_MS = 30 * 60 * 1000;

/**
 * Standalone payment page, reachable from an order that still needs paying.
 *
 * The previous version's "Pay Now" button POSTed an empty body to
 * `/orders/:id/pay`, which the backend accepted as a valid mock signature —
 * anyone with an order id could mark it paid without spending anything. It now
 * runs a genuine Razorpay payment whose signature the backend verifies.
 */
export default function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await apiFetch(`orders/${orderId}`);
      setOrder(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof ApiError && err.status === 404
          ? "We couldn't find that order. Check the link, or sign in with the account that placed it."
          : errorMessage(err)
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // Poll only while the order is still unpaid, so a completed or cancelled
  // order stops hitting the API forever.
  useEffect(() => {
    if (!order?.awaitingPayment) return;
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [order?.awaitingPayment, fetchOrder]);

  const isPaid = order && !order.awaitingPayment && order.status !== "CANCELLED";
  const isCancelled = order?.status === "CANCELLED" || order?.status === "REFUNDED";
  const isExpired =
    !!order?.createdAt &&
    order.awaitingPayment &&
    Date.now() - new Date(order.createdAt).getTime() > LINK_TTL_MS;

  const handlePay = async () => {
    if (!order || isPaying) return;
    setIsPaying(true);
    setError(null);

    if (!order.payment?.providerOrderId) {
      setError("This order has no active payment. Please start a new checkout.");
      setIsPaying(false);
      return;
    }

    try {
      const outcome = await openRazorpayCheckout({
        providerOrderId: order.payment.providerOrderId,
        amountPaise: order.totalPaise,
        currency: "INR",
        orderId: order.id,
        customer: {
          name: `${order.shippingAddress?.firstName ?? ""} ${order.shippingAddress?.lastName ?? ""}`.trim(),
          email: order.shippingAddress?.email ?? "",
          contact: order.shippingAddress?.phone ?? "",
        },
      });

      if (outcome.kind === "dismissed") {
        setError("Payment was cancelled. Your order is still waiting — you can try again.");
        return;
      }
      if (outcome.kind === "failed") {
        setError(outcome.message);
        await apiFetch(`orders/${order.id}/payment-failed`, {
          method: "POST",
          body: { reason: outcome.message },
        }).catch(() => {});
        return;
      }

      await apiFetch(`orders/${order.id}/pay`, { method: "POST", body: outcome.handshake });
      await fetchOrder();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsPaying(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111] border border-[#333] p-8 flex flex-col items-center shadow-2xl animate-pulse">
        <div className="w-12 h-12 bg-[#222] rounded-full mb-4"></div>
        <div className="h-6 w-3/4 bg-[#222] mb-2 rounded"></div>
        <div className="h-4 w-1/2 bg-[#222] mb-8 rounded"></div>
        <div className="w-full bg-black border border-[#222] p-6 mb-8 flex flex-col items-center">
          <div className="h-3 w-1/3 bg-[#222] mb-4 rounded"></div>
          <div className="h-10 w-2/3 bg-[#222] rounded"></div>
        </div>
        <div className="w-full h-14 bg-[#222] rounded"></div>
      </div>
    </div>
  );

  if (loadError || !order) return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-6 p-6 text-center">
      <AlertTriangle size={40} className="text-[#FF003C]" />
      <h1 className="text-xl font-bold uppercase tracking-widest">Payment link unavailable</h1>
      <p className="text-sm text-gray-400 font-medium max-w-sm">{loadError ?? "Order not found."}</p>
      <div className="flex gap-4 flex-wrap justify-center">
        <button onClick={fetchOrder} className="flex items-center gap-2 border border-[#333] hover:border-white p-4 text-xs font-bold uppercase tracking-widest transition-colors">
          <RefreshCw size={14} /> Try again
        </button>
        <Link href="/profile" className="border border-white hover:bg-white hover:text-black p-4 text-xs font-bold uppercase tracking-widest transition-colors">My orders</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111] border border-[#333] p-8 flex flex-col items-center shadow-2xl">
        <ShieldCheck size={48} className="text-[#00a86b] mb-4" />
        <h1 className="text-2xl font-black uppercase tracking-widest mb-2 text-center">Secure Payment</h1>
        <p className="text-sm text-gray-400 mb-8 font-medium">Order #{order.id.slice(0, 8).toUpperCase()}</p>

        <div className="w-full bg-black border border-[#222] p-6 mb-8 flex flex-col items-center">
          <span className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">Amount to Pay</span>
          <span className="text-4xl font-black text-white">{formatPaise(order.totalPaise)}</span>
        </div>

        {error && (
          <div role="alert" className="w-full bg-[#1a0509] border border-[#FF003C] p-4 mb-6 flex gap-3 items-start">
            <AlertTriangle size={18} className="text-[#FF003C] shrink-0 mt-0.5" />
            <p className="text-xs text-gray-300 font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {isPaid ? (
          <div className="w-full bg-[#00a86b]/10 border border-[#00a86b]/30 p-6 flex flex-col items-center">
            <CheckCircle2 size={32} className="text-[#00a86b] mb-3" />
            <span className="text-[#00a86b] font-bold uppercase tracking-wider text-center">Payment completed</span>
            <p className="text-xs text-gray-400 mt-2 text-center">You can close this window now.</p>
            <Link href={`/track?id=${order.id}`} className="mt-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 underline underline-offset-4 hover:text-white transition-colors">
              Track this order
            </Link>
          </div>
        ) : isCancelled ? (
          <div className="w-full bg-[#222] border border-[#333] p-6 flex flex-col items-center">
            <AlertTriangle size={32} className="text-gray-400 mb-3" />
            <span className="text-gray-300 font-bold uppercase tracking-wider text-center">Order cancelled</span>
            <p className="text-xs text-gray-500 mt-2 text-center">This order is no longer payable.</p>
          </div>
        ) : isExpired ? (
          <div className="w-full bg-[#FF003C]/10 border border-[#FF003C]/30 p-6 flex flex-col items-center">
            <Clock size={32} className="text-[#FF003C] mb-3" />
            <span className="text-[#FF003C] font-bold uppercase tracking-wider text-center">Payment link expired</span>
            <p className="text-xs text-gray-400 mt-2 text-center">
              The items have been released back into stock. Please place the order again.
            </p>
          </div>
        ) : (
          <button
            onClick={handlePay}
            disabled={isPaying}
            aria-busy={isPaying}
            className="w-full bg-[#FF003C] hover:bg-[#CC0030] disabled:bg-gray-800 text-white py-4 font-black uppercase tracking-widest transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
          >
            <CreditCard size={20} />
            {isPaying ? "Processing..." : "Pay Now"}
          </button>
        )}
      </div>
    </div>
  );
}
