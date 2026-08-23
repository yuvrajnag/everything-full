"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cartStore";

/**
 * Availability comes from live inventory (`inStock` / `stockAvailable`) rather
 * than a hardcoded "OUT OF STOCK" tag in the seed data, so a product that
 * actually sells out stops being addable.
 */
export function AddToCartButton({ product }: { product: any }) {
  const addItem = useCartStore((state) => state.addItem);
  const [clicked, setClicked] = useState(false);

  const isUpcoming = product.isUpcoming || product.tag === "UPCOMING";
  const soldOut = !isUpcoming && product.inStock === false;
  const disabled = soldOut;

  const handleAdd = () => {
    if (disabled) return;

    if (!isUpcoming) {
      addItem({
        id: product.cartItemId || product.id,
        productId: product.id,
        slug: product.slug,
        variantId: product.variantId,
        variantLabel: product.variantLabel ?? null,
        title: product.title,
        price: product.price,
        priceString: product.priceString,
        imageUrl: product.imageUrl,
        quantity: 1,
      });
    }

    setClicked(true);
    setTimeout(() => setClicked(false), 2000);
  };

  const getButtonText = () => {
    if (soldOut) return "Out of Stock";
    if (isUpcoming) return clicked ? "Notified!" : "Notify Me";
    return clicked ? "Added to Cart!" : "Add to Cart";
  };

  return (
    <button
      onClick={handleAdd}
      disabled={disabled}
      aria-disabled={disabled}
      className={`w-full py-4 font-bold text-lg rounded-none transition-all duration-200 mb-10 cursor-pointer active:scale-95 ${
        soldOut
          ? "bg-gray-800 text-gray-500 cursor-not-allowed"
          : isUpcoming
          ? clicked
            ? "bg-[#CC0030] text-white"
            : "bg-[#FF003C] text-white hover:bg-[#CC0030]"
          : clicked
          ? "bg-[#22c55e] text-white hover:bg-[#16a34a]"
          : "bg-white text-black hover:bg-gray-200"
      }`}
    >
      {getButtonText()}
    </button>
  );
}
