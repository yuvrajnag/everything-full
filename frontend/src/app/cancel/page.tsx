"use client";

import { Navbar } from "@/components/layout/Navbar";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, Suspense } from "react";
import { apiFetch, errorMessage } from "@/lib/api";
import { formatPaise } from "@/lib/format";

function CancelContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();

  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);

  const reasons = [
    "I changed my mind",
    "Found a better price elsewhere",
    "Delivery time is too long",
    "Ordered by mistake"
  ];

  // Load the order so the page can say honestly whether a refund is coming.
  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      setOrder(await apiFetch(`orders/${id}`));
    } catch {
      // Non-fatal: the cancel call below reports any real problem.
    }
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const willRefund = order?.payment?.status === "SUCCESS";

  const handleCancel = async () => {
    if (!id || isProcessing) return;
    setIsProcessing(true);
    setError(null);
    try {
      await apiFetch(`orders/${id}/cancel`, {
        method: "POST",
        // Refunds can take a few seconds to clear the payment provider.
        timeoutMs: 60_000,
      });
      router.push(`/track?id=${id}`);
    } catch (err) {
      // The backend refuses to cancel when a refund could not be issued, so
      // the customer needs to see exactly why rather than "Failed to cancel".
      setError(errorMessage(err));
      setIsProcessing(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!id) {
    return (
      <div className="flex-1 flex items-center justify-center font-bold tracking-widest uppercase">
        No order ID provided
      </div>
    );
  }

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 md:py-20 flex flex-col">
      {/* Back navigation */}
      <Link href={`/track?id=${id}`} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors mb-12 w-fit">
        <ArrowLeft size={16} />
        Back to Tracking
      </Link>

      {/* Header */}
      <div className="mb-12 border-b border-[#222] pb-8">
        <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-wider mb-2">Cancel Order</h1>
        <p className="text-gray-500 font-bold tracking-widest uppercase text-xs">
          Order #{id.slice(0,8).toUpperCase()}
        </p>
      </div>

      {error && (
        <div role="alert" className="bg-[#1a0509] border border-[#FF003C] p-6 mb-8 flex gap-4 items-start">
          <AlertTriangle size={24} className="text-[#FF003C] shrink-0" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#FF003C] mb-2">Cancellation failed</h3>
            <p className="text-sm text-gray-300 font-medium leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Warning Alert */}
      <div className="bg-[#111] border border-[#FF003C] p-6 mb-12 flex gap-4 items-start">
        <AlertTriangle size={24} className="text-[#FF003C] shrink-0" />
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#FF003C] mb-2">Warning: Permanent Action</h3>
          <p className="text-sm text-gray-400 font-medium leading-relaxed">
            Order cancellations cannot be undone. Once confirmed, your shipment will be intercepted.
            {" "}
            {willRefund
              ? `We'll refund ${formatPaise(order?.payment?.amountPaise)} to your original payment method; it usually lands within 5-7 business days. If the refund can't be issued, your order stays active and nothing changes.`
              : "Nothing has been charged for this order, so there is no refund to process."}
          </p>
        </div>
      </div>

      {/* Questionnaire Form */}
      <div className="flex flex-col gap-8">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Please tell us why you are cancelling:</h2>
        
        <div className="flex flex-col gap-4">
          {reasons.map(reason => (
            <label key={reason} onClick={() => setSelectedReason(reason)} className={`flex items-center gap-4 cursor-pointer group p-4 border transition-colors ${selectedReason === reason ? 'border-white bg-[#222]' : 'border-[#333] bg-[#111] hover:border-white'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${selectedReason === reason ? 'border border-white' : 'border border-[#555] group-hover:border-white'}`}>
                {selectedReason === reason && <div className="w-2.5 h-2.5 bg-[#FF003C] rounded-full"></div>}
              </div>
              <span className={`text-sm font-bold uppercase tracking-wider transition-colors ${selectedReason === reason ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{reason}</span>
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Additional Details (Optional)</label>
          <textarea 
            placeholder="Tell us more about your cancellation..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="w-full bg-[#111] border border-[#333] focus:border-white p-4 outline-none text-sm font-medium transition-colors min-h-[120px] resize-none"
          ></textarea>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-4 mt-12 pt-8 border-t border-[#222]">
        <Link href={`/track?id=${id}`} className="py-4 px-8 font-bold text-xs uppercase tracking-widest border border-[#333] text-gray-300 hover:text-white hover:border-white transition-colors text-center">
          Keep Order
        </Link>
        <button 
          onClick={handleCancel}
          disabled={!selectedReason || isProcessing}
          aria-busy={isProcessing}
          className="py-4 px-8 font-bold text-xs uppercase tracking-widest bg-[#FF003C] disabled:bg-gray-800 text-white hover:bg-[#CC0030] transition-colors text-center"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2 justify-center">
              <Loader2 size={14} className="animate-spin" />
              {willRefund ? "Issuing refund..." : "Cancelling..."}
            </span>
          ) : (
            "Confirm Cancellation"
          )}
        </button>
      </div>
    </main>
  );
}

export default function CancelOrderPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
        <CancelContent />
      </Suspense>
    </div>
  );
}
