"use client";

import { useMemo, useState } from "react";
import { AddToCartButton } from "./AddToCartButton";
import { formatPaise } from "@/lib/format";

interface Variant {
  id: string;
  label: string | null;
  isDefault: boolean;
  pricePaise: number;
  priceString: string;
  stockAvailable: number;
}

/**
 * Configuration picker and price display.
 *
 * The options are the product's real Variant rows from the database, so the
 * price shown here is the price the backend charges. The previous version
 * hardcoded the storage tiers and their surcharges in the component while the
 * server always billed the base variant — a customer could be shown ₹1,04,999
 * and charged ₹79,999.
 */
export function ProductPurchaseFlow({ product }: { product: any }) {
  const variants: Variant[] = useMemo(
    () => (Array.isArray(product.variants) ? product.variants : []),
    [product.variants]
  );

  const defaultVariant = useMemo(
    () => variants.find((v) => v.isDefault) ?? variants[0] ?? null,
    [variants]
  );

  const [selectedId, setSelectedId] = useState<string | null>(defaultVariant?.id ?? null);

  const selected = variants.find((v) => v.id === selectedId) ?? defaultVariant;

  const pricePaise = selected?.pricePaise ?? product.pricePaise ?? Math.round((product.price ?? 0) * 100);
  const priceString = formatPaise(pricePaise);

  const isUpcoming = product.tag === "UPCOMING" || product.isUpcoming;
  const stockAvailable = selected?.stockAvailable ?? product.stockAvailable ?? 0;
  const inStock = stockAvailable > 0;

  const productForCart = {
    ...product,
    price: pricePaise / 100,
    priceString,
    variantId: selected?.id,
    variantLabel: selected?.label ?? null,
    title: selected?.label ? `${product.title} (${selected.label})` : product.title,
    cartItemId: selected?.id ? `${product.id}::${selected.id}` : product.id,
    inStock,
    stockAvailable,
    isUpcoming,
  };

  return (
    <>
      <p className="text-3xl font-semibold mb-2">{priceString}</p>

      {/* Live availability, so a shopper learns an item is gone here rather
          than at the payment step. */}
      {!isUpcoming && (
        <p
          className={`text-xs font-bold uppercase tracking-widest mb-6 ${
            !inStock ? "text-[#FF003C]" : stockAvailable <= 5 ? "text-[#FFB020]" : "text-[#00a86b]"
          }`}
        >
          {!inStock
            ? "Out of stock"
            : stockAvailable <= 5
            ? `Only ${stockAvailable} left`
            : "In stock"}
        </p>
      )}
      {isUpcoming && (
        <p className="text-xs font-bold uppercase tracking-widest mb-6 text-gray-400">Coming soon</p>
      )}

      {variants.length > 1 && (
        <div className="flex flex-col gap-6 mb-10">
          <div>
            <p className="text-lg font-medium mb-4">RAM+Storage</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {variants.map((variant) => {
                const isSelected = variant.id === selected?.id;
                const soldOut = variant.stockAvailable <= 0;
                return (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedId(variant.id)}
                    aria-pressed={isSelected}
                    className={`py-4 px-6 text-left border transition-colors cursor-pointer ${
                      isSelected
                        ? "border-[#FF003C] text-white"
                        : "border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                    }`}
                  >
                    <span className="text-lg font-medium tracking-wide block">{variant.label}</span>
                    <span className="text-xs text-gray-500 tracking-wide">
                      {variant.priceString}
                      {soldOut && !isUpcoming ? " · Out of stock" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AddToCartButton product={productForCart} />
    </>
  );
}
