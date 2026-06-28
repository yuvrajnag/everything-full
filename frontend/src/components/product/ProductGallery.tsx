"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronUp, ChevronDown } from "lucide-react";

interface ProductGalleryProps {
  title: string;
  images: string[];
}

export function ProductGallery({ title, images }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev));
  };

  return (
    <div className="flex gap-6 h-[600px] w-full">
      {/* Thumbnails */}
      <div className="flex flex-col items-center justify-between py-4 w-20">
        <button 
          onClick={handlePrev}
          disabled={selectedIndex === 0}
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-gray-400"
        >
          <ChevronUp size={24} />
        </button>
        
        <div className="flex flex-col gap-4 overflow-hidden h-[400px]">
          {images.map((thumb, index) => (
            <div 
              key={index} 
              onClick={() => setSelectedIndex(index)}
              className={`relative w-16 h-16 border cursor-pointer flex-shrink-0 transition-all ${
                index === selectedIndex ? "border-white" : "border-white/10 opacity-60 hover:opacity-100"
              }`}
            >
              <Image 
                src={thumb}
                alt={`${title} Thumbnail ${index + 1}`}
                fill
                className="object-contain p-2"
              />
            </div>
          ))}
        </div>

        <button 
          onClick={handleNext}
          disabled={selectedIndex === images.length - 1}
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-gray-400"
        >
          <ChevronDown size={24} />
        </button>
      </div>

      {/* Main Image */}
      <div className="relative flex-1 bg-transparent rounded-none">
        <Image
          src={images[selectedIndex]}
          alt={title}
          fill
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
