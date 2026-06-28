"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, CreditCard, Banknote, Search, HelpCircle, ArrowLeft, ShoppingCart, User, QrCode, X, Loader2 } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useUserStore } from "@/store/userStore";
import { QRCodeSVG } from "qrcode.react";

export default function CheckoutPage() {
  const router = useRouter();
  const cartItems = useCartStore(state => state.items);
  const total = useCartStore(state => state.totalPrice());
  const clearCart = useCartStore(state => state.clearCart);
  
  const profile = useUserStore(state => state.profile);
  const updateProfile = useUserStore(state => state.updateProfile);

  const [paymentMethod, setPaymentMethod] = useState<'card'|'upi'|'cod'>('card');
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form states initialized from userStore
  const [email, setEmail] = useState(profile.email);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [address, setAddress] = useState(profile.address);
  const [city, setCity] = useState(profile.city);
  const [stateRegion, setStateRegion] = useState(profile.stateRegion);
  const [pinCode, setPinCode] = useState(profile.pinCode);
  const [phone, setPhone] = useState(profile.phone);
  
  // Card states
  const [cardNumber, setCardNumber] = useState(profile.cardNumber);
  const [cardName, setCardName] = useState(profile.cardName);
  const [cardExpiry, setCardExpiry] = useState(profile.cardExpiry);
  const [cardCvv, setCardCvv] = useState(profile.cardCvv);

  // Error state for validation
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});

  useEffect(() => setMounted(true), []);

  // Poll for payment status if UPI
  useEffect(() => {
    if (!showUpiModal || !createdOrderId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/proxy/orders/${createdOrderId}`);
        const order = await res.json();
        if (order.status === 'PAID') {
          clearInterval(interval);
          clearCart();
          router.push(`/track?id=${createdOrderId}`);
        }
      } catch (err) {}
    }, 2000);
    return () => clearInterval(interval);
  }, [showUpiModal, createdOrderId, router, clearCart]);

  const handlePaymentSelect = (method: 'card'|'upi'|'cod') => {
    setPaymentMethod(method);
    setErrors({});
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    
    // Validation
    const newErrors: { [key: string]: boolean } = {};
    
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) newErrors.email = true;
    if (!firstName.trim()) newErrors.firstName = true;
    if (!lastName.trim()) newErrors.lastName = true;
    if (!address.trim()) newErrors.address = true;
    if (!city.trim()) newErrors.city = true;
    if (!stateRegion) newErrors.stateRegion = true;
    if (!pinCode || !/^\d{6}$/.test(pinCode.replace(/\D/g, ''))) newErrors.pinCode = true;
    if (!phone || !/^\d{10}$/.test(phone.replace(/\D/g, ''))) newErrors.phone = true;

    if (paymentMethod === 'card') {
      if (!cardNumber || !/^\d{16}$/.test(cardNumber.replace(/\D/g, ''))) newErrors.cardNumber = true;
      if (!cardName.trim()) newErrors.cardName = true;
      if (!cardExpiry || !/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(cardExpiry)) newErrors.cardExpiry = true;
      if (!cardCvv || !/^\d{3,4}$/.test(cardCvv)) newErrors.cardCvv = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to top to see errors if many
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrors({});
    setIsProcessing(true);

    // Save to profile
    updateProfile({
      email, firstName, lastName, address, city, stateRegion, pinCode, phone,
      cardNumber: paymentMethod === 'card' ? cardNumber : profile.cardNumber,
      cardName: paymentMethod === 'card' ? cardName : profile.cardName,
      cardExpiry: paymentMethod === 'card' ? cardExpiry : profile.cardExpiry,
      cardCvv: paymentMethod === 'card' ? cardCvv : profile.cardCvv
    });

    try {
      // Generate idempotency key to prevent duplicate orders on double-click/retry
      const idempotencyKey = crypto.randomUUID();
      
      const res = await fetch("/api/proxy/orders", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          items: cartItems.map(i => ({
            productId: i.productId || i.id.replace(/-(12GB\+256GB|16GB\+512GB|24GB\+1TB)$/, ''),
            quantity: i.quantity,
          })),
          paymentMethod,
          shippingAddress: {
             email, firstName, lastName, address, city, state: stateRegion, pinCode, phone, country: "India"
          }
        })
      });
      const order = await res.json();
      
      if (!res.ok) {
        throw new Error(order.error || "Failed to create order");
      }
      
      if (paymentMethod === 'upi') {
        setCreatedOrderId(order.id);
        setShowUpiModal(true);
      } else {
        clearCart();
        router.push(`/track?id=${order.id}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create order");
    } finally {
      setIsProcessing(false);
    }
  };

  const formattedTotal = "₹" + total.toLocaleString("en-IN");
  
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
      
      {/* UPI QR Modal */}
      {showUpiModal && createdOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-[#333] p-10 w-full max-w-md flex flex-col items-center relative shadow-2xl">
            <button 
              onClick={() => setShowUpiModal(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-[#FF003C] transition-colors active:scale-95"
            >
              <X size={28} />
            </button>
            <h3 className="text-2xl font-black uppercase tracking-widest mb-2">Scan to Pay</h3>
            <p className="text-sm text-gray-400 mb-10 font-medium">Amount: {formattedTotal}</p>
            
            <div className="bg-white p-6 w-64 h-64 flex items-center justify-center border-4 border-[#FF003C]">
              <QRCodeSVG value={`https://everything-oddy.vercel.app/pay/${createdOrderId}`} size={200} />
            </div>
            
            <div className="mt-10 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-[#FF003C] animate-spin" />
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Waiting for payment...</p>
            </div>
          </div>
        </div>
      )}

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

            {/* Card Inputs Condition */}
            {paymentMethod === 'card' && (
              <div className="mt-6 flex flex-col gap-4 bg-[#111] border border-[#222] p-6 shadow-inner">
                <input 
                  type="text" 
                  value={cardNumber}
                  onChange={(e) => { 
                    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                    setCardNumber(val); 
                    setErrors({...errors, cardNumber: false}); 
                  }}
                  placeholder="Card number" 
                  className={getInputClass('cardNumber')}
                  autoComplete="off"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    value={cardExpiry}
                    onChange={(e) => { 
                      let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                      setCardExpiry(val); 
                      setErrors({...errors, cardExpiry: false}); 
                    }}
                    placeholder="MM/YY" 
                    maxLength={5}
                    className={getInputClass('cardExpiry')}
                    autoComplete="off"
                  />
                  <input 
                    type="text" 
                    value={cardCvv}
                    onChange={(e) => { 
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setCardCvv(val); 
                      setErrors({...errors, cardCvv: false}); 
                    }}
                    placeholder="Security code (CVV)" 
                    className={getInputClass('cardCvv')}
                    maxLength={4}
                    autoComplete="off"
                  />
                </div>
                <input 
                  type="text" 
                  value={cardName}
                  onChange={(e) => { setCardName(e.target.value); setErrors({...errors, cardName: false}); }}
                  placeholder="Name on card" 
                  className={getInputClass('cardName')}
                  autoComplete="off"
                />
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
                disabled={isProcessing}
                className="bg-[#FF003C] disabled:bg-gray-800 disabled:cursor-not-allowed hover:bg-[#CC0030] text-white py-4 px-8 font-bold text-sm uppercase tracking-widest transition-all duration-200 active:scale-[0.98] flex items-center justify-center min-w-[240px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Continue to shipping"
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
                </div>
                <span className="text-sm font-bold text-white">{"₹" + (item.price * item.quantity).toLocaleString("en-IN")}</span>
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
