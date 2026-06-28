"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cartStore";

export function AddToCartButton({ product }: { product: any }) {
  const addItem = useCartStore((state) => state.addItem);
  const [clicked, setClicked] = useState(false);

  const handleAdd = () => {
    if (product.tag === "OUT OF STOCK") return;
    
    if (product.tag !== "UPCOMING") {
      addItem({
        id: product.cartItemId || product.id,
        productId: product.id,
        title: product.title,
        price: product.price,
        priceString: product.priceString,
        imageUrl: product.imageUrl,
        quantity: 1
      });
    }

    setClicked(true);
    setTimeout(() => setClicked(false), 2000);
  };

  const getButtonText = () => {
    if (product.tag === "OUT OF STOCK") return "Out of Stock";
    if (product.tag === "UPCOMING") return clicked ? "Notified!" : "Notify Me";
    return clicked ? "Added to Cart!" : "Add to Cart";
  };

  return (
    <button 
      onClick={handleAdd}
      disabled={product.tag === "OUT OF STOCK"}
      className={`w-full py-4 font-bold text-lg rounded-none transition-all duration-200 mb-10 cursor-pointer active:scale-95 ${
        product.tag === "OUT OF STOCK" 
          ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
          : product.tag === "UPCOMING"
          ? (clicked ? "bg-[#CC0030] text-white" : "bg-[#FF003C] text-white hover:bg-[#CC0030]")
          : clicked
          ? "bg-[#22c55e] text-white hover:bg-[#16a34a]"
          : "bg-white text-black hover:bg-gray-200"
      }`}
    >
      {getButtonText()}
    </button>
  );
}
