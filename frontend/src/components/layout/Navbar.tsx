"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Search, ShoppingCart, User, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { performSearch } from "@/lib/searchUtils";
import { useRouter } from "next/navigation";

export function Navbar() {
  const router = useRouter();
  const [show, setShow] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // Need to handle hydration mismatch for Zustand persist
  const [mounted, setMounted] = useState(false);
  const totalItems = useCartStore((state) => state.totalItems());

  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch("/api/proxy/products")
      .then(res => res.json())
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const results = performSearch(searchQuery, products);
    setSearchResults(results.slice(0, 5));
  }, [searchQuery, products]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchFocused(false);
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== "undefined") {
        // Only hide if we've scrolled down a bit to avoid jitter at the very top
        if (window.scrollY > lastScrollY && window.scrollY > 50) {
          setShow(false);
        } else {
          setShow(true);
        }
        setLastScrollY(window.scrollY);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", handleScroll);
      };
    }
  }, [lastScrollY]);

  return (
    <header className={`w-full sticky top-0 z-50 transition-transform duration-300 ${show ? 'translate-y-0' : '-translate-y-full'}`}>
      {/* Top Warning Strip */}
      <div className="bg-[#FF0000] text-white flex items-center justify-center py-1.5 px-4 text-[13px] font-semibold tracking-wide gap-1.5 uppercase">
        <TriangleAlert size={16} />
        <span className="font-sans">IT&apos;S CURRENTLY AVAILABLE ONLY IN INDIA.</span>
      </div>

      {/* Main Navbar */}
      <div className="bg-black px-4 pt-[13px] pb-3 flex items-center justify-between relative">
        {/* Left: Logo */}
        <div className="flex-shrink-0 flex items-center z-10 h-[24px]">
           <Link href="/" className="w-[200px] sm:w-[280px] h-[28px] sm:h-[38px] relative -ml-1 cursor-pointer block">
            <Image
              src="/logos/everything.png"
              alt="Everything"
              fill
              className="object-contain object-left"
              priority
            />
          </Link>
        </div>

        {/* Center: Search Bar */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-0 flex-col">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full h-10 bg-[#1a1a1a] rounded-[2px] overflow-hidden border border-transparent focus-within:border-[#333] transition-colors">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              placeholder="Search products..."
              className="w-full h-full bg-transparent border-none outline-none px-4 text-white text-sm font-medium"
            />
            <button type="submit" className="h-full px-4 text-white transition-colors flex items-center justify-center cursor-pointer hover:text-gray-300">
              <Search size={18} />
            </button>
          </form>
          
          {/* Search Dropdown */}
          {isSearchFocused && searchResults.length > 0 && (
            <div className="absolute top-12 left-4 right-4 bg-[#111] border border-[#333] shadow-2xl z-50 max-h-[400px] overflow-y-auto">
              {searchResults.map((product) => (
                <Link 
                  key={product.id} 
                  href={`/product/${product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  className="flex items-center gap-4 p-4 border-b border-[#222] hover:bg-[#1a1a1a] transition-colors"
                  onClick={() => {
                    setSearchQuery("");
                    setIsSearchFocused(false);
                  }}
                >
                  <div className="w-12 h-12 bg-black border border-[#333] flex items-center justify-center p-1 relative shrink-0">
                    <Image src={product.imageUrl} alt={product.title} fill className="object-contain" unoptimized={true} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">{product.title}</span>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500">{product.category}</span>
                  </div>
                  <div className="ml-auto text-xs font-bold text-[#FF003C]">
                    {product.priceString || ("₹" + product.price.toLocaleString("en-IN"))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right: Icons */}
        <div className="flex-shrink-0 flex items-center gap-4 sm:gap-10">
          <Link href="/cart" className="relative text-white transition-colors hover:text-gray-300">
            <ShoppingCart size={22} strokeWidth={2} />
            {mounted && totalItems > 0 && (
              <span className="absolute -top-1 -right-1.5 bg-[#FF0000] text-white text-[10px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>
          <Link href="/profile" className="text-white transition-colors hover:text-gray-300 active:scale-95 cursor-pointer">
            <User size={22} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </header>
  );
}
