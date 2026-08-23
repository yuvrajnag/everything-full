"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Trash2, ShoppingCart, Undo2, Package, Minus, Plus, ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/home/ProductCard";
import { useCartStore } from "@/store/cartStore";
import { apiFetch } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { MAX_QUANTITY_PER_ITEM } from "@/store/cartStore";

export default function CartPage() {
  const cartItems = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const total = useCartStore((state) => state.totalPrice());
  
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Recommendations are decorative — a failure just hides the section.
    apiFetch<any[]>("products")
      .then((data) => {
        if (!Array.isArray(data)) return;
        const inStock = data.filter((p) => p.inStock);
        const shuffled = [...inStock].sort(() => 0.5 - Math.random());
        setRelatedProducts(shuffled.slice(0, 4));
      })
      .catch(() => setRelatedProducts([]));
    // Only fetched once: re-running on every cart change reshuffled the
    // recommendations each time an item was added or removed.
  }, []);

  const formattedTotal = formatRupees(total);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col items-center">
      <Navbar />

      <main className="w-full max-w-[1200px] px-4 py-12 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="flex flex-col mb-10">
          <div className="text-sm mb-6 text-gray-500 font-medium">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="mx-3">/</span>
            <span className="text-white">Cart</span>
          </div>
          <h1 className="text-3xl font-bold tracking-wide uppercase">Shopping Cart</h1>
        </div>

        {/* 2-Column Layout */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Cart Items */}
          <div className="flex-1 w-full flex flex-col">
            <div className="hidden md:grid grid-cols-12 gap-4 pb-4 border-b border-[#333] text-[11px] font-bold tracking-[0.15em] text-gray-400 uppercase">
              <div className="col-span-7">Product</div>
              <div className="col-span-3 text-center">Quantity</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            {cartItems.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-500">
                <ShoppingCart size={48} className="mb-4 opacity-20" />
                <p className="text-xl uppercase tracking-widest font-bold">Your cart is empty</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 py-8 border-b border-[#222] items-center">
                  <div className="col-span-1 md:col-span-7 flex items-start gap-6">
                    <div className="w-24 h-24 relative bg-[#111] flex items-center justify-center p-2">
                      <Image 
                        src={item.imageUrl} 
                        alt={item.title} 
                        fill 
                        className="object-contain" 
                      />
                    </div>
                    <div className="flex flex-col pt-1">
                      <Link href={item.slug ? `/product/${item.slug}` : "/"} className="text-lg font-bold text-white tracking-wide uppercase hover:text-[#FF003C] transition-colors">
                        {item.title}
                      </Link>
                      {item.variantLabel && (
                        <span className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">{item.variantLabel}</span>
                      )}
                      <span className="md:hidden text-white font-medium mt-3">{item.priceString}</span>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-3 flex md:justify-center items-center mt-4 md:mt-0">
                    <div className="flex items-center border border-[#333] bg-black">
                      <button 
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#111] transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-12 text-center text-sm font-semibold text-white">
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= MAX_QUANTITY_PER_ITEM}
                        title={item.quantity >= MAX_QUANTITY_PER_ITEM ? `Maximum ${MAX_QUANTITY_PER_ITEM} per item` : undefined}
                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#111] transition-colors disabled:text-[#333] disabled:hover:bg-transparent disabled:cursor-not-allowed"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 flex justify-between md:justify-end items-center mt-4 md:mt-0 gap-6">
                    <span className="hidden md:inline-block text-white font-medium text-lg">
                      {formatRupees(item.price * item.quantity)}
                    </span>
                    <button onClick={() => removeItem(item.id)} className="text-gray-500 hover:text-[#FF003C] transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column: Order Summary */}
          <div className="w-full lg:w-[380px]">
            <div className="bg-[#111] border border-[#222] p-8 flex flex-col">
              <h2 className="text-xl font-bold mb-6 uppercase tracking-wide">Order Summary</h2>
              
              <div className="flex flex-col gap-4 border-b border-[#222] pb-6">
                <div className="flex justify-between items-center text-[15px]">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white">{formattedTotal}</span>
                </div>
                <div className="flex justify-between items-center text-[15px]">
                  <span className="text-gray-400">Estimated Delivery</span>
                  <span className="text-white">Free</span>
                </div>
              </div>

              <div className="pt-6 flex justify-between items-end mb-8">
                <div className="flex flex-col">
                  <span className="text-lg font-bold uppercase tracking-wide">Total</span>
                  <span className="text-xs text-gray-500 mt-1">Including GST</span>
                </div>
                <span className="text-2xl font-bold text-[#FF003C]">{formattedTotal}</span>
              </div>

              <div className="flex flex-col gap-3">
                <Link href={cartItems.length > 0 ? "/checkout" : "#"}>
                  <button 
                    disabled={cartItems.length === 0}
                    className="w-full bg-[#FF003C] disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-[#CC0030] text-white py-4 flex items-center justify-center gap-2 font-bold text-[15px] uppercase tracking-wide transition-colors"
                  >
                    Proceed to Checkout
                    <ArrowRight size={18} />
                  </button>
                </Link>
                <Link 
                  href="/" 
                  className="w-full bg-transparent border border-[#333] hover:border-gray-500 text-white py-4 flex items-center justify-center font-bold text-[15px] uppercase tracking-wide transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* You May Also Like Section */}
        <div className="mt-32 w-full flex flex-col">
          <h2 className="text-2xl font-bold uppercase tracking-widest text-center mb-12">You may also like</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {relatedProducts.map((product) => {
              const slug = product.slug;
              return (
                <Link href={`/product/${slug}`} key={product.id} className="block h-full">
                  <ProductCard
                    brand={product.brand}
                    tag={product.tag}
                    title={product.title}
                    description={product.description}
                    price={product.priceString}
                    imageUrl={product.imageUrl}
                    hoverImageUrl={product.hoverImageUrl}
                  />
                </Link>
              );
            })}
          </div>
          
          <div className="flex justify-center">
            <Link href="/" className="border border-white hover:bg-white hover:text-black text-white font-bold text-sm uppercase tracking-widest py-4 px-12 transition-colors">
              View All
            </Link>
          </div>
        </div>

        {/* Footer Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 mb-16 w-full">
          <div className="flex items-center justify-center gap-6 p-8 border border-[#222] bg-[#0c0c0c]">
            <ShoppingCart size={32} strokeWidth={1.5} className="text-white" />
            <span className="text-[13px] font-bold text-gray-300 uppercase tracking-widest text-left leading-relaxed">
              100% Secure<br/>Checkout
            </span>
          </div>
          <div className="flex items-center justify-center gap-6 p-8 border border-[#222] bg-[#0c0c0c]">
            <Undo2 size={32} strokeWidth={1.5} className="text-white" />
            <span className="text-[13px] font-bold text-gray-300 uppercase tracking-widest text-left leading-relaxed">
              Reliable Warranty<br/>& 7-Day Returns
            </span>
          </div>
          <div className="flex items-center justify-center gap-6 p-8 border border-[#222] bg-[#0c0c0c]">
            <Package size={32} strokeWidth={1.5} className="text-white" />
            <span className="text-[13px] font-bold text-gray-300 uppercase tracking-widest text-left leading-relaxed">
              Free Shipping On<br/>Orders Over ₹10,000
            </span>
          </div>
        </div>

      </main>
    </div>
  );
}
