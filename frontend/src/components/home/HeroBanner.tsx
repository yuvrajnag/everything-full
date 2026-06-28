"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const slides = [
  { src: "/stuff/e.png", query: "edge" },
  { src: "/stuff/x.png", query: "extreme" }
];

export function HeroBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q");

  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-scroll logic
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex === slides.length - 1 ? 0 : prevIndex + 1));
    }, 4000); // Change slide every 4 seconds
    return () => clearInterval(interval);
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? slides.length - 1 : prevIndex - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === slides.length - 1 ? 0 : prevIndex + 1));
  };

  if (q) {
    return null; // hide banner when searching
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 relative group">
      <div className="w-full aspect-[21/6] bg-black rounded-none relative overflow-hidden flex items-center justify-center border border-white/10 group">
        
        {/* Slides */}
        {slides.map((slide, index) => (
          <div
            key={index}
            onClick={() => router.push(`/?q=${slide.query}`)}
            className={`absolute inset-0 cursor-pointer transition-opacity duration-700 ease-in-out ${
              index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <Image
              src={slide.src}
              alt={`Hero Banner ${index + 1}`}
              fill
              className="object-contain"
              priority={index === 0}
              unoptimized={true}
            />
          </div>
        ))}

        {/* Left Arrow */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 z-20 p-2 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#FF0000] border border-white/20"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Right Arrow */}
        <button
          onClick={goToNext}
          className="absolute right-4 z-20 p-2 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#FF0000] border border-white/20"
        >
          <ChevronRight size={24} />
        </button>

        {/* Indicators (Custom Pill Design) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`transition-all duration-300 rounded-full border ${
                index === currentIndex
                  ? "w-10 h-3 bg-white border-white"
                  : "w-3 h-3 bg-white/30 border-white/20 hover:bg-white/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
