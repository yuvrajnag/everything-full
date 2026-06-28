"use client";
import { useState, useEffect } from "react";
import { ArrowRight, X } from "lucide-react";
import Image from "next/image";

export function ProductDetailsModal({ 
  shortDescription, 
  fullDetails,
  productTitle,
  seriesLogoUrl
}: { 
  shortDescription: string; 
  fullDetails: string;
  productTitle: string;
  seriesLogoUrl?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Headers
      if (line.startsWith('#### ')) {
        return <h4 key={i} className="text-[17px] font-bold text-white mt-10 mb-4 border-b border-[#222] pb-3 tracking-wide">{line.replace('#### ', '')}</h4>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-xl font-black text-[#e0e0e0] uppercase tracking-[0.2em] mt-12 mb-6">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-3xl md:text-4xl font-black text-[#FF003C] uppercase tracking-widest mt-14 mb-8 font-orbitron">{line.replace('## ', '')}</h2>;
      }
      
      // List Items
      if (line.trim().startsWith('- ')) {
        const formattedLine = line.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold tracking-wide">$1</strong>');
        return (
          <li key={i} className="ml-5 mb-3 list-none relative text-gray-300 before:content-[''] before:absolute before:left-[-1.2rem] before:top-[0.6rem] before:w-1.5 before:h-1.5 before:bg-[#FF003C] before:rounded-full" dangerouslySetInnerHTML={{ __html: formattedLine }} />
        );
      }

      // Empty Lines
      if (line.trim() === '') return null;
      
      // Normal Paragraphs
      const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold tracking-wide">$1</strong>');
      return <p key={i} className="mb-5 text-gray-400 leading-[1.8] text-[15px]" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
    });
  };

  return (
    <>
      <div className="mb-8 text-gray-300 text-[15px] leading-relaxed">
        {shortDescription}
      </div>

      {fullDetails && (
        <button 
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 text-white font-semibold text-sm hover:underline mb-10 w-fit"
        >
          Learn More <ArrowRight size={16} />
        </button>
      )}

      {/* Modal Overlay */}
      <div 
        className={`fixed inset-0 z-50 flex flex-col justify-end items-center transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsOpen(false)} />
        
        {/* Sliding Modal Body */}
        <div 
          className={`relative bg-[#0a0a0a] border-t border-[#333] w-full h-[95vh] rounded-t-[2.5rem] shadow-[0_-20px_80px_-15px_rgba(255,0,60,0.15)] flex flex-col transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${isOpen ? 'translate-y-0' : 'translate-y-full'} overflow-hidden`}
        >
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-[#333] rounded-full z-20" />

          <button 
            onClick={() => setIsOpen(false)}
            className="absolute top-6 right-6 p-2.5 bg-[#111] rounded-full border border-[#222] hover:bg-white hover:text-black transition-colors z-20 active:scale-95"
          >
            <X size={20} />
          </button>

          {/* Scrollable Content Area - Hiding scrollbar for sleeker look */}
          <div className="flex-1 overflow-y-auto w-full pt-16 pb-20 px-6 md:px-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="w-full">
              <div className="flex flex-col items-center mb-16 mt-4 border-b border-[#222] pb-12">
                <div className="w-48 h-8 relative mb-8">
                  <Image src={seriesLogoUrl || "/logos/everything.png"} alt="Series Logo" fill className="object-contain" />
                </div>
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-[0.15em] text-white text-center font-inter">
                  {productTitle}
                </h2>
              </div>
              
              <div className="font-inter text-base md:text-[17px] leading-relaxed">
                {renderMarkdown(fullDetails)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
