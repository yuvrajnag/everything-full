"use client";

import { useState } from "react";

export function ProductConfig() {
  const [selectedConfig, setSelectedConfig] = useState("12GB+256GB");

  const options = ["12GB+256GB", "16GB+512GB", "24GB+1TB"];

  return (
    <div className="flex flex-col gap-6 mb-10">
      <div>
        <p className="text-lg font-medium mb-4">RAM+Storage</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => setSelectedConfig(option)}
              className={`py-4 px-6 text-left border transition-colors cursor-pointer ${
                selectedConfig === option
                  ? "border-[#FF003C] text-white"
                  : "border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300"
              }`}
            >
              <span className="text-lg font-medium tracking-wide">{option}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
