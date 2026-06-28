"use client";

import { useState } from "react";
import { AddToCartButton } from "./AddToCartButton";

export function ProductPurchaseFlow({ product }: { product: any }) {
  const [selectedConfig, setSelectedConfig] = useState("12GB+256GB");
  
  const options = [
    { label: "12GB+256GB", extra: 0 },
    { label: "16GB+512GB", extra: 10000 },
    { label: "24GB+1TB", extra: 25000 }
  ];

  const basePriceNum = parseInt(product.priceString.replace(/[^\d]/g, ""), 10) || product.price;
  
  const selectedOption = options.find(o => o.label === selectedConfig) || options[0];
  const finalPriceNum = basePriceNum + selectedOption.extra;
  const finalPriceString = "₹" + finalPriceNum.toLocaleString("en-IN");

  const productForCart = {
    ...product,
    price: finalPriceNum,
    priceString: finalPriceString,
    title: product.hasConfig ? `${product.title} (${selectedConfig})` : product.title,
    cartItemId: product.hasConfig ? `${product.id}-${selectedConfig}` : product.id
  };

  return (
    <>
      <p className="text-3xl font-semibold mb-6">{finalPriceString}</p>

      {product.hasConfig && (
        <div className="flex flex-col gap-6 mb-10">
          <div>
            <p className="text-lg font-medium mb-4">RAM+Storage</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {options.map((option) => (
                <button
                  key={option.label}
                  onClick={() => setSelectedConfig(option.label)}
                  className={`py-4 px-6 text-left border transition-colors cursor-pointer ${
                    selectedConfig === option.label
                      ? "border-[#FF003C] text-white"
                      : "border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                  }`}
                >
                  <span className="text-lg font-medium tracking-wide">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <AddToCartButton product={productForCart} />
    </>
  );
}
