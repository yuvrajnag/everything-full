"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronRight, ChevronLeft, CreditCard, Banknote, HelpCircle, ArrowLeft, ShoppingCart, User, QrCode, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useUserStore } from "@/store/userStore";
import { apiFetch, ApiError, errorMessage } from "@/lib/api";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { formatRupees } from "@/lib/format";

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const cartItems = useCartStore(state => state.items);
  const total = useCartStore(state => state.totalPrice());
  const clearCart = useCartStore(state => state.clearCart);

  const profile = useUserStore(state => state.profile);
  const updateProfile = useUserStore(state => state.updateProfile);

  const [paymentMethod, setPaymentMethod] = useState<'card'|'upi'|'cod'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("Processing...");
  const [mounted, setMounted] = useState(false);

  /** Banner shown above the form when the order cannot be placed. */
  const [failure, setFailure] = useState<{ message: string; code: string | null } | null>(null);

  // Form states initialized from userStore
  const [email, setEmail] = useState(profile.email);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [address, setAddress] = useState(profile.address);
  const [city, setCity] = useState(profile.city);
  const [stateRegion, setStateRegion] = useState(profile.stateRegion);
  const [pinCode, setPinCode] = useState(profile.pinCode);
  const [phone, setPhone] = useState(profile.phone);
  
  // Error state for validation
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});

  useEffect(() => setMounted(true), []);

  // An empty cart has nothing to check out.
  useEffect(() => {
    if (mounted && cartItems.length === 0 && !isProcessing) {
      router.replace("/cart");
    }
  }, [mounted, cartItems.length, isProcessing, router]);

  const handlePaymentSelect = (method: 'card'|'upi'|'cod') => {
    setPaymentMethod(method);
    setErrors({});
    setFailure(null);
  };

  /** Validates the shipping form. Card details are collected by Razorpay, not here. */
  const validate = useCallback(() => {
    const newErrors: { [key: string]: boolean } = {};

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) newErrors.email = true;
    if (!firstName.trim()) newErrors.firstName = true;
    if (!lastName.trim()) newErrors.lastName = true;
    if (!address.trim()) newErrors.address = true;
    if (!city.trim()) newErrors.city = true;
    if (!stateRegion) newErrors.stateRegion = true;
    if (!/^\d{6}$/.test(pinCode.replace(/\D/g, ''))) newErrors.pinCode = true;
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) newErrors.phone = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, firstName, lastName, address, city, stateRegion, pinCode, phone]);

  /** Tells the backend a payment attempt was declined or abandoned. */
  const reportPaymentFailure = async (orderId: string, reason: string) => {
    try {
      await apiFetch(`orders/${orderId}/payment-failed`, { method: "POST", body: { reason } });
    } catch {
      // Best effort: the stale-checkout sweep releases the stock either way.
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0 || isProcessing) return;

    setFailure(null);

    if (sessionStatus === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent("/checkout")}`);
      return;
    }

    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsProcessing(true);
    setProcessingLabel("Placing your order...");

    // Persist the shipping details for next time. Card data is never stored.
    updateProfile({ email, firstName, lastName, address, city, stateRegion, pinCode, phone });

    let order: any;
    try {
      // A stable key per attempt: a double-click or a retry after a network
      // blip resolves to the same order instead of creating a second one.
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      order = await apiFetch("orders", {
        method: "POST",
        idempotencyKey,
        body: {
          items: cartItems.map(i => ({
            productId: i.productId,
            ...(i.variantId ? { variantId: i.variantId } : {}),
            quantity: i.quantity,
          })),
          paymentMethod,
          shippingAddress: {
            email, firstName, lastName, address, city,
            state: stateRegion, pinCode, phone, country: "India",
          },
        },
      });
    } catch (err) {
      setIsProcessing(false);

      if (err instanceof ApiError) {
        if (err.isAuthError) {
          router.push(`/login?callbackUrl=${encodeURIComponent("/checkout")}`);
          return;
        }
        // A sold-out line can be pointed at precisely.
        if (err.code === "OUT_OF_STOCK" || err.code === "PRODUCT_UNAVAILABLE" || err.code === "VARIANT_UNAVAILABLE") {
          setFailure({ message: err.message, code: err.code });
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }

      setFailure({ message: errorMessage(err), code: err instanceof ApiError ? err.code : null });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Cash on Delivery is confirmed server-side; nothing to pay now.
    if (paymentMethod === 'cod') {
      clearCart();
      router.push(`/track?id=${order.id}`);
      return;
    }

    // ── Online payment: hand off to Razorpay Checkout ──────────────────
    if (!order?.payment?.providerOrderId) {
      setIsProcessing(false);
      setFailure({
        message: "We could not start the payment for this order. No money has been taken — please try again.",
        code: "PAYMENT_INIT_FAILED",
      });
      return;
    }

    setProcessingLabel("Opening secure payment...");

    let outcome;
    try {
      outcome = await openRazorpayCheckout({
        providerOrderId: order.payment.providerOrderId,
        amountPaise: order.payment.amount,
        currency: order.payment.currency || "INR",
        orderId: order.id,
        customer: {
          name: `${firstName} ${lastName}`.trim(),
          email,
          contact: phone,
        },
        method: paymentMethod,
      });
    } catch (err) {
      setIsProcessing(false);
      await reportPaymentFailure(order.id, errorMessage(err));
      setFailure({ message: errorMessage(err), code: "CHECKOUT_UNAVAILABLE" });
      return;
    }

    if (outcome.kind === "dismissed") {
      setIsProcessing(false);
      await reportPaymentFailure(order.id, "Customer closed the payment window");
      setFailure({
        message: "Payment was cancelled, so your order has not been placed. Your cart is still here whenever you're ready.",
        code: "PAYMENT_CANCELLED",
      });
      return;
    }

    if (outcome.kind === "failed") {
      setIsProcessing(false);
      await reportPaymentFailure(order.id, outcome.message);
      setFailure({ message: outcome.message, code: outcome.code ?? "PAYMENT_DECLINED" });
      return;
    }

    // ── Payment succeeded: confirm it server-side ──────────────────────
    setProcessingLabel("Confirming your payment...");
    try {
      await apiFetch(`orders/${order.id}/pay`, {
        method: "POST",
        body: outcome.handshake,
      });
      clearCart();
      router.push(`/track?id=${order.id}`);
    } catch (err) {
      setIsProcessing(false);
      setFailure({
        message: `${errorMessage(err)} Your payment reference is ${outcome.handshake.razorpay_payment_id} — quote it if you need to contact us.`,
        code: "PAYMENT_CONFIRM_FAILED",
      });
    }
  };

  const formattedTotal = formatRupees(total);
  
  const getInputClass = (field: string) => {
    return `w-full bg-transparent border p-4 outline-none text-sm font-medium transition-all duration-300 ${
      errors[field] ? 'border-[#FF003C] shadow-[0_0_8px_rgba(255,0,60,0.5)] bg-[#2a0810]' : 'border-[#333] focus:border-white'
    }`;
  };

  const getSelectClass = (field: string) => {
    return `w-full bg-[#111] border p-4 outline-none text-sm font-medium text-white appearance-none cursor-pointer transition-all duration-300 ${
      errors[field] ? 'border-[#FF003C] shadow-[0_0_8px_rgba(255,0,60,0.5)]' : 'border-[#333] focus:border-white'
    }`;
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col md:flex-row relative">
      
      {/* Left Column: Form Area */}
      <div className="flex-1 flex md:justify-end border-r border-[#222]">
        <div className="w-full md:max-w-[700px] px-6 py-10 md:px-12 md:py-16 flex flex-col">
          
          {/* Header */}
          <div className="w-full mb-10 flex justify-between items-center relative">
            <div className="flex-shrink-0 flex items-center z-10">
              <Link href="/cart" className="hover:text-gray-300 transition-colors active:scale-95">
                <ArrowLeft size={24} strokeWidth={2} />
              </Link>
            </div>
            <div className="flex-shrink-0 flex items-center gap-10">
              <Link href="/cart" className="relative text-white hover:text-gray-300 transition-colors active:scale-95">
                <ShoppingCart size={22} strokeWidth={2} />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-[#FF0000] text-white text-[10px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                )}
              </Link>
              <Link href="/profile" className="text-white hover:text-gray-300 transition-colors active:scale-95">
                <User size={22} strokeWidth={2} />
              </Link>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-12 flex-wrap">
            <Link href="/cart" className="hover:text-white transition-colors cursor-pointer active:scale-95">Cart</Link>
            <ChevronRight size={14} />
            <span className="text-white">Shipping</span>
            <ChevronRight size={14} />
            <span>Payment</span>
          </div>

          {/* Anything that stopped the order from going through, shown in
              context instead of a browser alert() the customer can't act on. */}
          {failure && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-10 flex items-start gap-4 border border-[#FF003C] bg-[#1a0509] p-6"
            >
              <AlertTriangle size={22} className="text-[#FF003C] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-3">
                <p className="text-sm font-bold uppercase tracking-widest text-[#FF003C]">
                  {failure.code === "OUT_OF_STOCK"
                    ? "Item unavailable"
                    : failure.code === "PAYMENT_CANCELLED"
                    ? "Payment cancelled"
                    : failure.code === "PAYMENT_DECLINED"
                    ? "Payment declined"
                    : "We couldn't place your order"}
                </p>
                <p className="text-sm text-gray-300 font-medium leading-relaxed">{failure.message}</p>
                {(failure.code === "OUT_OF_STOCK" ||
                  failure.code === "PRODUCT_UNAVAILABLE" ||
                  failure.code === "VARIANT_UNAVAILABLE") && (
                  <Link
                    href="/cart"
                    className="text-xs font-bold uppercase tracking-widest text-white underline underline-offset-4 hover:text-[#FF003C] transition-colors w-fit"
                  >
                    Edit your cart
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Payment Methods */}
          <div className="mb-10 w-full relative pt-3">
            <div className="absolute inset-0 flex items-center top-0 h-[10px]">
              <div className="w-full border-t border-[#333]"></div>
            </div>
            <div className="relative flex justify-center text-center">
              <span className="bg-[#0a0a0a] px-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 -mt-2">
                Payment Method
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-6">
              <button 
                onClick={() => handlePaymentSelect('card')}
                className={`flex items-center justify-center gap-2 border py-4 transition-all duration-200 active:scale-[0.98] group ${paymentMethod === 'card' ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-[#111] border-[#333] hover:bg-white hover:text-black text-white'}`}
              >
                <CreditCard size={18} className={paymentMethod === 'card' ? 'text-black' : 'group-hover:text-black text-gray-300'} />
                <span className="text-xs font-bold uppercase tracking-wider">Card</span>
              </button>
              
              <button 
                onClick={() => handlePaymentSelect('upi')}
                className={`flex items-center justify-center gap-2 border py-4 transition-all duration-200 active:scale-[0.98] ${paymentMethod === 'upi' ? 'bg-[#39729b] border-[#39729b] text-white shadow-[0_0_20px_rgba(57,114,155,0.4)]' : 'bg-[#111] border-[#333] hover:bg-[#39729b] hover:border-[#39729b] text-white'}`}
              >
                <QrCode size={18} className="text-white" />
                <span className="text-xs font-bold uppercase tracking-wider">UPI</span>
              </button>
              
              <button 
                onClick={() => handlePaymentSelect('cod')}
                className={`flex items-center justify-center gap-2 border py-4 transition-all duration-200 active:scale-[0.98] ${paymentMethod === 'cod' ? 'bg-[#00a86b] border-[#00a86b] text-white shadow-[0_0_20px_rgba(0,168,107,0.4)]' : 'bg-[#111] border-[#333] hover:bg-[#00a86b] hover:border-[#00a86b] text-white'}`}
              >
                <Banknote size={18} className="text-white" />
                <span className="text-xs font-bold uppercase tracking-wider">COD</span>
              </button>
            </div>

            {/* Card and UPI details are entered inside Razorpay's secure window,
                so no payment credentials are ever handled by this site. */}
            {paymentMethod !== 'cod' && (
              <div className="mt-6 flex items-start gap-3 bg-[#111] border border-[#222] p-6 shadow-inner">
                <ShieldCheck size={20} className="text-[#00a86b] shrink-0 mt-0.5" />
                <p className="text-sm text-gray-400 font-medium leading-relaxed">
                  {paymentMethod === 'card'
                    ? "You'll enter your card details in Razorpay's secure payment window after you confirm this order. We never see or store your card number."
                    : "You'll be shown a UPI QR code and app options in Razorpay's secure payment window after you confirm this order."}
                </p>
              </div>
            )}

            {paymentMethod === 'cod' && (
              <div className="mt-6 flex items-start gap-3 bg-[#111] border border-[#222] p-6 shadow-inner">
                <Banknote size={20} className="text-[#00a86b] shrink-0 mt-0.5" />
                <p className="text-sm text-gray-400 font-medium leading-relaxed">
                  Pay in cash when your order is delivered. Nothing is charged now.
                </p>
              </div>
            )}
          </div>

          {/* Form Sections */}
          <div className="flex flex-col gap-10">
            {/* Contact Section */}
            <section>
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-xl font-bold uppercase tracking-wide">Contact</h2>
              </div>
              <div className="flex flex-col gap-4">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors({...errors, email: false}); }}
                  placeholder="Email or mobile phone number" 
                  className={getInputClass('email')}
                  autoComplete="off"
                />
              </div>
            </section>

            {/* Shipping Address Section */}
            <section>
              <h2 className="text-xl font-bold uppercase tracking-wide mb-4">Shipping address</h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Country/Region</label>
                  <select className="w-full bg-[#111] border border-[#333] focus:border-white p-4 outline-none text-sm font-medium text-white appearance-none cursor-pointer opacity-50">
                    <option>India</option>
                  </select>
                </div>
                <div className="flex gap-4">
                  <input type="text" value={firstName} onChange={(e) => { setFirstName(e.target.value); setErrors({...errors, firstName: false}); }} placeholder="First name" className={getInputClass('firstName')} autoComplete="off" />
                  <input type="text" value={lastName} onChange={(e) => { setLastName(e.target.value); setErrors({...errors, lastName: false}); }} placeholder="Last name" className={getInputClass('lastName')} autoComplete="off" />
                </div>
                <div className="relative">
                  <input type="text" value={address} onChange={(e) => { setAddress(e.target.value); setErrors({...errors, address: false}); }} placeholder="Address" className={getInputClass('address')} autoComplete="off" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <input type="text" value={city} onChange={(e) => { setCity(e.target.value); setErrors({...errors, city: false}); }} placeholder="City" className={getInputClass('city')} autoComplete="off" />
                  <select value={stateRegion} onChange={(e) => { setStateRegion(e.target.value); setErrors({...errors, stateRegion: false}); }} className={getSelectClass('stateRegion')}>
                    <option value="">State</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                    <option value="Lakshadweep">Lakshadweep</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Puducherry">Puducherry</option>
                    <option value="Ladakh">Ladakh</option>
                    <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                  </select>
                  <input type="text" value={pinCode} onChange={(e) => { 
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setPinCode(val); 
                    setErrors({...errors, pinCode: false}); 
                  }} placeholder="PIN code" className={getInputClass('pinCode')} autoComplete="off" />
                </div>
                
                {/* Phone Number Field */}
                <div className="flex gap-4">
                  <select className="w-24 bg-[#111] border border-[#333] focus:border-white p-4 outline-none text-sm font-medium text-white appearance-none cursor-pointer text-center">
                    <option value="+91">+91 (IN)</option>
                  </select>
                  <input type="tel" value={phone} onChange={(e) => { 
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone(val); 
                    setErrors({...errors, phone: false}); 
                  }} placeholder="Phone number" className={getInputClass('phone')} autoComplete="off" />
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="flex justify-between items-center mt-6 pt-6">
              <Link href="/cart" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white hover:text-[#FF003C] transition-colors group">
                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Return to cart
              </Link>
              <button 
                onClick={handleCheckout}
                disabled={isProcessing || cartItems.length === 0}
                aria-busy={isProcessing}
                className="bg-[#FF003C] disabled:bg-gray-800 disabled:cursor-not-allowed hover:bg-[#CC0030] text-white py-4 px-8 font-bold text-sm uppercase tracking-widest transition-all duration-200 active:scale-[0.98] flex items-center justify-center min-w-[240px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {processingLabel}
                  </>
                ) : paymentMethod === 'cod' ? (
                  `Place order · ${formattedTotal}`
                ) : (
                  `Pay ${formattedTotal}`
                )}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Right Column: Order Summary */}
      <div className="w-full md:w-[45%] bg-[#111] flex md:justify-start border-t md:border-t-0 border-[#222]">
        <div className="w-full max-w-[550px] px-6 py-10 md:px-12 md:py-16 flex flex-col sticky top-0 h-max">
          
          {/* Cart Items */}
          <div className="flex flex-col gap-6 mb-8 border-b border-[#222] pb-8">
            {cartItems.map(item => (
              <div key={item.id} className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-black border border-[#333] flex items-center justify-center p-2">
                    <Image src={item.imageUrl} alt={item.title} width={60} height={60} className="object-contain" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#333] border border-[#555] rounded-full flex items-center justify-center text-xs font-bold text-white z-10">
                    {item.quantity}
                  </div>
                </div>
                <div className="flex-1 flex flex-col pt-1">
                  <span className="text-sm font-bold uppercase tracking-wider text-white">{item.title}</span>
                  {item.variantLabel && (
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">{item.variantLabel}</span>
                  )}
                </div>
                <span className="text-sm font-bold text-white">{formatRupees(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Subtotals */}
          <div className="flex flex-col gap-4 border-b border-[#222] pb-8 mb-8">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white font-bold">{formattedTotal}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-gray-400 flex items-center gap-2">
                Shipping <HelpCircle size={14} className="text-[#333]" />
              </span>
              <span className="text-xs text-gray-500">Free</span>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-end">
            <span className="text-xl font-bold uppercase tracking-wider">Total</span>
            <div className="flex items-end gap-2">
              <span className="text-xs text-gray-500 font-bold tracking-widest mb-1">INR</span>
              <span className="text-3xl font-black text-[#FF003C]">{formattedTotal}</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
