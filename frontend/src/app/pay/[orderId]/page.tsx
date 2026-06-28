"use client";

import { useEffect, useState, use } from "react";
import { CheckCircle2, ShieldCheck, CreditCard } from "lucide-react";

export default function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const resolvedParams = use(params);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/proxy/orders/${resolvedParams.orderId}`)
      .then(res => res.json())
      .then(data => {
        setOrder(data);
        if (data.status === 'PAID') {
           setSuccess(true);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [resolvedParams.orderId]);

  const handlePay = async () => {
    setIsPaying(true);
    try {
      const res = await fetch(`/api/proxy/orders/${resolvedParams.orderId}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const err = await res.json();
        alert(err.error || "Payment failed");
      }
    } catch (err) {
      console.error(err);
      alert("Payment failed");
    } finally {
      setIsPaying(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">Loading...</div>;

  if (!order) return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">Order not found</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111] border border-[#333] p-8 flex flex-col items-center shadow-2xl">
        <ShieldCheck size={48} className="text-[#00a86b] mb-4" />
        <h1 className="text-2xl font-black uppercase tracking-widest mb-2">Secure Payment</h1>
        <p className="text-sm text-gray-400 mb-8 font-medium">Order #{order.id.slice(0,8).toUpperCase()}</p>
        
        <div className="w-full bg-black border border-[#222] p-6 mb-8 flex flex-col items-center">
          <span className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">Amount to Pay</span>
          <span className="text-4xl font-black text-white">{"₹" + order.totalAmount.toLocaleString("en-IN")}</span>
        </div>

        {success ? (
          <div className="w-full bg-[#00a86b]/10 border border-[#00a86b]/30 p-6 flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <CheckCircle2 size={32} className="text-[#00a86b] mb-3" />
            <span className="text-[#00a86b] font-bold uppercase tracking-wider text-center">Payment Successful!</span>
            <p className="text-xs text-gray-400 mt-2 text-center">You can close this window now.</p>
          </div>
        ) : (
          <button 
            onClick={handlePay}
            disabled={isPaying}
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
