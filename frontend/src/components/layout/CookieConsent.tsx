"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      // Small delay for better UX
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  const accept = () => {
    localStorage.setItem("cookie_consent", "true");
    setShow(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[340px] bg-[#0c0c0c] border border-[#222] shadow-2xl p-6 text-white font-inter animate-in fade-in slide-in-from-bottom-8 duration-500">
      <button onClick={() => setShow(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
        <X size={16} />
      </button>
      <h3 className="font-bold uppercase tracking-widest text-sm mb-3 text-[#FF003C]">Cookies & Privacy</h3>
      <p className="text-[11px] text-gray-400 mb-6 leading-relaxed">
        We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept", you consent to our use of cookies.
      </p>
      <div className="flex gap-3">
        <button onClick={accept} className="flex-1 bg-white hover:bg-gray-200 text-black py-3 font-bold uppercase tracking-widest text-[10px] transition-colors active:scale-95">
          Accept
        </button>
        <button onClick={() => setShow(false)} className="flex-1 border border-[#333] hover:border-gray-500 text-white py-3 font-bold uppercase tracking-widest text-[10px] transition-colors active:scale-95">
          Decline
        </button>
      </div>
    </div>
  );
}
