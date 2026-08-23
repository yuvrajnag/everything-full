"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useUserStore } from "@/store/userStore";
import { ShieldCheck, MapPin, Mail, Phone, Clock, ChevronRight, Package, User, X, AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { signOut, useSession } from "next-auth/react";
import { apiFetch, ApiError, errorMessage } from "@/lib/api";
import { formatPaise } from "@/lib/format";
import { useCallback } from "react";

/** Colour-codes the status chip on each order card. */
const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[#FFB020]/20 text-[#FFB020]",
  PAID: "bg-[#00a86b]/20 text-[#00a86b]",
  CONFIRMED: "bg-[#00a86b]/20 text-[#00a86b]",
  SHIPPED: "bg-[#39729b]/20 text-[#7db9e0]",
  DELIVERED: "bg-[#00a86b]/20 text-[#00a86b]",
  CANCELLED: "bg-[#222] text-gray-400",
  REFUNDED: "bg-[#222] text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
};

export default function ProfilePage() {
  const { data: session } = useSession();
  const profile = useUserStore(state => state.profile);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(profile);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<any[]>("orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      // Previously any failure here left an empty list that looked exactly
      // like "you have no orders". Say what actually happened instead.
      setOrders([]);
      setLoadError(
        err instanceof ApiError && err.isAuthError
          ? "Your session has expired. Please sign in again to see your orders."
          : errorMessage(err)
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadOrders();
  }, [loadOrders]);

  if (!mounted) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    useUserStore.getState().updateProfile(editForm);
    setShowEditModal(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-[#333] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-[#222]">
              <h2 className="text-xl font-bold uppercase tracking-wider">Edit Profile</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase text-gray-500 font-bold">First Name</label>
                  <input required type="text" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} className="bg-black border border-[#333] p-3 text-sm focus:border-white outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase text-gray-500 font-bold">Last Name</label>
                  <input required type="text" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} className="bg-black border border-[#333] p-3 text-sm focus:border-white outline-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase text-gray-500 font-bold">Email</label>
                <input required type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="bg-black border border-[#333] p-3 text-sm focus:border-white outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase text-gray-500 font-bold">Phone</label>
                <input required type="tel" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="bg-black border border-[#333] p-3 text-sm focus:border-white outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase text-gray-500 font-bold">Address</label>
                <input required type="text" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="bg-black border border-[#333] p-3 text-sm focus:border-white outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase text-gray-500 font-bold">City</label>
                  <input required type="text" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="bg-black border border-[#333] p-3 text-sm focus:border-white outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase text-gray-500 font-bold">State</label>
                  <input required type="text" value={editForm.stateRegion} onChange={e => setEditForm({...editForm, stateRegion: e.target.value})} className="bg-black border border-[#333] p-3 text-sm focus:border-white outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-3 border border-[#333] text-sm font-bold uppercase tracking-widest hover:bg-[#222]">Cancel</button>
                <button type="submit" className="px-6 py-3 bg-white text-black text-sm font-bold uppercase tracking-widest hover:bg-gray-200">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Navbar />

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-20 grid grid-cols-1 md:grid-cols-3 gap-12">
        
        {/* Left Column: User Details */}
        <div className="flex flex-col gap-10">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-widest mb-2">My Profile</h1>
              <p className="text-gray-500 font-bold tracking-widest uppercase text-xs">
                Manage your account
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => { setEditForm(profile); setShowEditModal(true); }} className="text-[10px] font-bold uppercase tracking-widest text-white border border-[#333] hover:bg-white hover:text-black transition-colors px-4 py-2 active:scale-95">
                Edit Profile
              </button>
              <button onClick={() => signOut({ callbackUrl: '/' })} className="text-[10px] font-bold uppercase tracking-widest text-[#FF003C] border border-[#FF003C]/30 hover:bg-[#FF003C] hover:text-white transition-colors px-4 py-2 active:scale-95">
                Sign Out
              </button>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] p-8 flex flex-col gap-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b border-[#333] pb-4">Personal Info</h2>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 text-sm font-medium">
                <User className="text-gray-500" size={18} />
                {/* Before the first checkout there is nothing in local storage,
                    so fall back to the signed-in Google account. */}
                <span>
                  {`${profile.firstName} ${profile.lastName}`.trim() ||
                    session?.user?.name ||
                    "Your account"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm font-medium">
                <Mail className="text-gray-500" size={18} />
                <span>{profile.email || session?.user?.email || "Not provided"}</span>
              </div>
              <div className="flex items-center gap-4 text-sm font-medium">
                <Phone className="text-gray-500" size={18} />
                <span>+91 {profile.phone || "Not provided"}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] p-8 flex flex-col gap-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b border-[#333] pb-4">Saved Address</h2>
            <div className="flex items-start gap-4 text-sm font-medium leading-relaxed">
              <MapPin className="text-gray-500 shrink-0 mt-0.5" size={18} />
              <div>
                <p>{profile.address || "No address saved"}</p>
                <p>{profile.city}{profile.stateRegion ? `, ${profile.stateRegion}` : ''}</p>
                <p>PIN: {profile.pinCode}</p>
                <p>India</p>
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] p-8 flex flex-col gap-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b border-[#333] pb-4">Payment</h2>
            <div className="flex items-start gap-4 text-sm font-medium">
              <ShieldCheck className="text-[#00a86b] shrink-0 mt-0.5" size={18} />
              <p className="text-gray-400 leading-relaxed">
                Card and UPI details are entered in Razorpay&apos;s secure window at checkout.
                We never store your payment credentials.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Order History */}
        <div className="md:col-span-2 flex flex-col">
          <h2 className="text-xl font-bold uppercase tracking-wide mb-8">Order History</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#333] border-t-[#FF003C] rounded-full animate-spin"></div>
            </div>
          ) : loadError ? (
            <div role="alert" className="bg-[#1a0509] border border-[#FF003C] p-8 flex flex-col items-start gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-[#FF003C]" />
                <p className="text-sm font-bold uppercase tracking-widest text-[#FF003C]">Couldn&apos;t load your orders</p>
              </div>
              <p className="text-sm text-gray-300 font-medium">{loadError}</p>
              <button
                onClick={loadOrders}
                className="flex items-center gap-2 py-3 px-6 border border-[#333] hover:border-white text-white font-bold uppercase tracking-wider text-xs transition-colors"
              >
                <RefreshCw size={14} /> Try again
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-[#111] border border-[#222] p-12 flex flex-col items-center justify-center text-center">
              <Package size={48} className="text-[#333] mb-6" />
              <p className="text-lg font-bold uppercase tracking-widest text-gray-400 mb-2">No orders found</p>
              <p className="text-sm text-gray-500 font-medium">You haven&apos;t placed any orders yet.</p>
              <Link href="/" className="mt-8 py-3 px-6 bg-white text-black font-bold uppercase tracking-wider text-xs active:scale-95 transition-transform">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {orders.map((order) => {
                const date = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const isCancelled = order.status === "CANCELLED" || order.status === "REFUNDED";
                const statusStyle = STATUS_STYLES[order.status] ?? "bg-[#FF003C]/20 text-[#FF003C]";
                const statusLabel = STATUS_LABELS[order.status] ?? order.status;
                const refunded = (order.payment?.refundedAmountPaise ?? 0) > 0;
                
                return (
                  <div key={order.id} className="bg-[#111] border border-[#222] hover:border-[#444] transition-colors group relative overflow-hidden">
                    {/* Status indicator bar */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${isCancelled ? 'bg-gray-600' : (order.status === 'PAID' || order.status === 'CONFIRMED' || order.status === 'DELIVERED') ? 'bg-[#00a86b]' : 'bg-[#FF003C]'}`}></div>
                    
                    <div className="p-6 md:p-8">
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 pb-6 border-b border-[#222]">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Order #{order.id.slice(0,8).toUpperCase()}</span>
                            <span className={`text-[10px] px-2 py-1 font-bold uppercase tracking-widest ${statusStyle}`}>
                              {statusLabel}
                            </span>
                            {refunded && (
                              <span className="text-[10px] px-2 py-1 font-bold uppercase tracking-widest bg-[#222] text-gray-300">
                                Refunded {formatPaise(order.payment.refundedAmountPaise)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                            <Clock size={14} />
                            Placed on {date}
                          </div>
                        </div>
                        <div className="text-xl font-bold">{formatPaise(order.totalPaise)}</div>
                      </div>

                      <div className="flex items-center gap-4 mb-6 overflow-x-auto pb-2">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="relative w-16 h-16 bg-black border border-[#333] shrink-0 p-1">
                            <Image src={item.product.imageUrl || "/logos/favicon.png"} alt={item.product.title} fill className="object-contain" />
                            {item.quantity > 1 && (
                              <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#FF003C] rounded-full flex items-center justify-center text-[10px] font-bold text-white z-10">
                                {item.quantity}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <Link 
                        href={`/track?id=${order.id}`}
                        className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-300 hover:text-white transition-colors"
                      >
                        {order.awaitingPayment ? 'Complete payment' : isCancelled ? 'View details' : 'Track order'}
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
