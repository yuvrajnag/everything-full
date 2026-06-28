"use client";

import Link from "next/link";
import { ArrowLeft, ShoppingCart, User } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useState, useEffect } from "react";

export function ProductHeader() {
  const [mounted, setMounted] = useState(false);
  const totalItems = useCartStore((state) => state.totalItems());

  useEffect(() => setMounted(true), []);

  return (
    <div className="w-full px-4 pt-[13px] pb-3 flex justify-between items-center relative">
      <div className="flex-shrink-0 flex items-center z-10">
        <Link href="/" className="hover:text-gray-300 transition-colors cursor-pointer">
          <ArrowLeft size={24} strokeWidth={2} />
        </Link>
      </div>
      <div className="flex-shrink-0 flex items-center gap-10">
        <Link href="/cart" className="relative text-white hover:text-gray-300 transition-colors cursor-pointer">
          <ShoppingCart size={22} strokeWidth={2} />
          {mounted && totalItems > 0 && (
            <span className="absolute -top-1 -right-1.5 bg-[#FF0000] text-white text-[10px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </Link>
        <Link href="/profile" className="text-white hover:text-gray-300 transition-colors cursor-pointer">
          <User size={22} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
