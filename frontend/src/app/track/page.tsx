"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import Image from "next/image";
import { Check, Package, Truck, Home, HelpCircle, ArrowRight, AlertTriangle, RefreshCw, CreditCard } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, ApiError, errorMessage } from "@/lib/api";
import { formatPaise } from "@/lib/format";

/** Timeline steps. PAID and CONFIRMED (Cash on Delivery) share the same step. */
const STEPS = [
  ["PENDING"],
  ["PAID", "CONFIRMED"],
  ["SHIPPED"],
  ["DELIVERED"],
];

function TrackContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setError("No order was specified.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setOrder(await apiFetch(`orders/${id}`));
    } catch (err) {
      // A failed fetch used to fall through to a bare "Order not found",
      // which is misleading when the real problem is a dropped connection
      // or an expired session.
      setOrder(null);
      setError(
        err instanceof ApiError && err.status === 404
          ? "We couldn't find that order. It may belong to a different account."
          : errorMessage(err)
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex-1 flex items-center justify-center font-bold tracking-widest uppercase py-32">Loading order...</div>;

  if (error || !order?.id) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-32 px-6 text-center">
      <AlertTriangle size={40} className="text-[#FF003C]" />
      <h1 className="text-2xl font-bold uppercase tracking-widest">Couldn&apos;t load this order</h1>
      <p className="text-sm text-gray-400 font-medium max-w-md">{error ?? "Order not found."}</p>
      <div className="flex flex-wrap gap-4 justify-center">
        <button onClick={load} className="flex items-center gap-2 text-sm border border-[#333] hover:border-white p-4 font-bold uppercase tracking-wider transition-colors">
          <RefreshCw size={14} /> Try again
        </button>
        <Link href="/profile" className="text-sm border border-white p-4 hover:bg-white hover:text-black font-bold uppercase tracking-wider transition-colors">My orders</Link>
      </div>
    </div>
  );

  const isCancelled = order.status === "CANCELLED" || order.status === "REFUNDED";
  const currentStatusIndex = isCancelled ? -1 : STEPS.findIndex(group => group.includes(order.status));
  const refundedPaise = order.payment?.refundedAmountPaise ?? 0;
  
  const placedDate = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  const getIconClass = (stepIndex: number) => {
    if (isCancelled) return "bg-[#333] border-[#333] text-gray-500";
    if (currentStatusIndex > stepIndex) return "bg-[#FF003C] border-[#FF003C] shadow-[0_0_15px_rgba(255,0,60,0.5)] text-white";
    if (currentStatusIndex === stepIndex) return "bg-black border-[#FF003C] text-[#FF003C]";
    return "bg-black border-[#333] text-[#555]";
  };
  
  const getTextClass = (stepIndex: number) => {
    if (isCancelled) return "text-gray-500";
    if (currentStatusIndex > stepIndex) return "text-white";
    if (currentStatusIndex === stepIndex) return "text-[#FF003C]";
    return "text-gray-500";
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 md:py-20">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider mb-2">Track Order</h1>
          <p className="text-gray-500 font-bold tracking-widest uppercase text-xs">
            Order #{order.id.slice(0,8).toUpperCase()} <span className="mx-2 text-[#333]">|</span> Placed on {placedDate}
          </p>
        </div>
        <div className="bg-[#111] border border-[#333] px-6 py-4 flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Status</span>
          <span className={`text-xl font-bold uppercase tracking-widest ${isCancelled ? 'text-gray-500' : 'text-white'}`}>
            {order.status === "CONFIRMED" ? "Confirmed" : order.status === "PENDING" ? "Awaiting payment" : order.status}
          </span>
          <span className="text-xs font-bold tracking-widest text-gray-400 mt-2">{formatPaise(order.totalPaise)}</span>
        </div>
      </div>

      {isCancelled ? (
        <div className="mb-16 border-l-4 border-gray-600 pl-6 py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Order Cancelled</p>
          {/* Only promise a refund when money actually changed hands — a
              cancelled Cash on Delivery order was never charged. */}
          <p className="text-2xl md:text-3xl font-bold uppercase tracking-wide text-gray-500">
            {refundedPaise > 0 ? `Refund of ${formatPaise(refundedPaise)} issued` : "No payment was taken"}
          </p>
          {refundedPaise > 0 && (
            <p className="text-xs text-gray-500 font-medium mt-2">
              It should reach your original payment method within 5-7 business days.
              {order.payment?.providerRefundId ? ` Reference: ${order.payment.providerRefundId}` : ""}
            </p>
          )}
        </div>
      ) : order.awaitingPayment ? (
        <div className="mb-16 border-l-4 border-[#FFB020] pl-6 py-2 flex flex-col gap-3 items-start">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Awaiting payment</p>
          <p className="text-2xl md:text-3xl font-bold uppercase tracking-wide text-[#FFB020]">Payment not completed</p>
          <p className="text-sm text-gray-400 font-medium max-w-lg">
            {order.payment?.failureReason
              ? `Last attempt: ${order.payment.failureReason}.`
              : "This order is reserved but not paid for."} You can finish paying below.
          </p>
          <Link href={`/pay/${order.id}`} className="flex items-center gap-2 mt-2 bg-[#FF003C] hover:bg-[#CC0030] text-white py-3 px-6 font-bold text-xs uppercase tracking-widest transition-colors">
            <CreditCard size={14} /> Complete payment
          </Link>
        </div>
      ) : (
        <div className="mb-16 border-l-4 border-[#FF003C] pl-6 py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Estimated Delivery</p>
          <p className="text-2xl md:text-3xl font-bold uppercase tracking-wide text-white">Within 3-5 Days</p>
        </div>
      )}

      {/* Tracking Timeline */}
      <div className="bg-[#111] border border-[#222] p-8 md:p-12 mb-12">
        <h2 className="text-lg font-bold uppercase tracking-wider mb-10">Delivery Progress</h2>
        
        <div className="relative">
          <div className="absolute top-5 left-0 w-full h-[2px] bg-[#333] hidden md:block"></div>
          {!isCancelled && (
            <div 
              className="absolute top-5 left-0 h-[2px] bg-[#FF003C] hidden md:block"
              style={{ width: `${Math.max(0, currentStatusIndex * 33.33)}%` }}
            ></div>
          )}

          <div className="flex flex-col md:flex-row justify-between relative z-10 gap-8 md:gap-0">
            {/* Step 0: Placed / PENDING */}
            <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-3">
              <div className={`w-10 h-10 rounded-none flex items-center justify-center border-2 transition-colors ${getIconClass(0)}`}>
                <Check size={20} />
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest transition-colors ${getTextClass(0)}`}>Order Placed</p>
              </div>
            </div>

            {/* Step 1: Paid / Processing */}
            <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-3">
              <div className={`w-10 h-10 rounded-none flex items-center justify-center border-2 transition-colors ${getIconClass(1)}`}>
                <Package size={18} />
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest transition-colors ${getTextClass(1)}`}>Processing</p>
              </div>
            </div>

            {/* Step 2: Shipped */}
            <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-3">
              <div className={`w-10 h-10 rounded-none flex items-center justify-center border-2 transition-colors ${getIconClass(2)}`}>
                <Truck size={18} />
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest transition-colors ${getTextClass(2)}`}>Shipped</p>
              </div>
            </div>

            {/* Step 3: Delivered */}
            <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-3">
              <div className={`w-10 h-10 rounded-none flex items-center justify-center border-2 transition-colors ${getIconClass(3)}`}>
                <Home size={18} />
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest transition-colors ${getTextClass(3)}`}>Delivered</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Two Columns: Items & Address */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        
        {/* Items */}
        <div className="md:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-widest mb-6 text-gray-400 border-b border-[#222] pb-4">Items in this shipment</h2>
          <div className="flex flex-col gap-4">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex items-center gap-6 p-4 bg-[#111] border border-[#222] hover:border-[#444] transition-colors cursor-pointer group">
                <div className="w-24 h-24 bg-black border border-[#333] flex items-center justify-center p-2 relative">
                  <Image src={item.product.imageUrl || "/logos/favicon.png"} alt={item.product.title} width={70} height={70} className="object-contain" />
                  <div className="absolute -top-2 -right-2 bg-[#333] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center">{item.quantity}</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold uppercase tracking-wide">{item.product.title}</h3>
                  {item.variantLabel && (
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">{item.variantLabel}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatPaise(item.linePricePaise)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping & Support */}
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest mb-6 text-gray-400 border-b border-[#222] pb-4">Shipping To</h2>
            {/* The address recorded on the order itself — never a guess from
                whatever happens to be in this browser's local storage. */}
            {order.shippingAddress ? (
              <p className="text-sm font-medium leading-relaxed">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br/>
                {order.shippingAddress.addressLine}<br/>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pinCode}<br/>
                {order.shippingAddress.country}<br/>
                {order.shippingAddress.phone ? `+91 ${order.shippingAddress.phone}` : ''}
              </p>
            ) : (
              <p className="text-sm text-gray-500 font-medium">No shipping address on file for this order.</p>
            )}
          </div>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest mb-6 text-gray-400 border-b border-[#222] pb-4">Need Help?</h2>
            <div className="flex flex-col gap-3">
              <button className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-white bg-[#111] border border-[#333] p-4 hover:bg-white hover:text-black transition-colors w-full text-left active:scale-[0.98]">
                <HelpCircle size={16} />
                Contact Support
              </button>
              {order.cancellable && (
                <Link href={`/cancel?id=${order.id}`} className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 p-4 hover:text-[#FF003C] transition-colors w-full text-left border border-transparent hover:border-[#333]">
                  Cancel Order
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center font-bold tracking-widest uppercase">Loading...</div>}>
        <TrackContent />
      </Suspense>
    </div>
  );
}
