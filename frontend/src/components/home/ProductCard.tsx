import Image from "next/image";
import { useState } from "react";

interface ProductCardProps {
  brand: "extreme" | "edge";
  tag?: string;
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  hoverImageUrl?: string;
}

export function ProductCard({ brand, tag, title, description, price, imageUrl, hoverImageUrl }: ProductCardProps) {
  const logoSrc = brand === "extreme" ? "/logos/eXtreme.png" : "/logos/edge.png";
  
  const [imgSrc, setImgSrc] = useState(imageUrl);
  
  return (
    <div className="bg-[#171719] rounded-none w-full h-full flex flex-col p-4 relative cursor-pointer hover:ring-1 hover:ring-white/20 transition-all group">
      {/* Brand Logo (Top Left) */}
      <div className="absolute top-4 left-4 w-6 h-6 z-20">
        <Image
          src={logoSrc}
          alt={`${brand} logo`}
          fill
          className="object-contain"
        />
      </div>

      {/* Dynamic Badge (Top Right) */}
      {tag && (
        <div className="absolute top-4 right-4 bg-[#350000] px-2 h-[21px] flex items-center justify-center rounded-none z-20">
          <span className="font-orbitron font-black text-[10px] leading-[15px] text-[#FF0000] tracking-wide whitespace-nowrap">
            {tag}
          </span>
        </div>
      )}

      {/* Product Image Section */}
      <div className="w-full aspect-[4/3] relative mb-6 mt-4 overflow-hidden">
        <Image
          src={imgSrc}
          alt={title}
          fill
          unoptimized={true}
          onError={() => setImgSrc(imageUrl)}
          className="object-contain transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      {/* Text Section */}
      <div className="flex flex-col flex-1 text-left">
        <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
        <p className="text-[#a1a1aa] text-sm leading-relaxed mb-6 line-clamp-3">
          {description}
        </p>
        <div className="mt-auto">
          <span className="text-white font-bold">{price}</span>
        </div>
      </div>
    </div>
  );
}
