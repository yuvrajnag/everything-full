import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="w-full bg-[#0a0a0a] border-t border-[#222] text-white pt-16 pb-8 mt-auto font-inter">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="flex flex-col gap-4">
          <Link href="/" className="w-[240px] h-[32px] relative cursor-pointer block mb-2">
            <Image
              src="/logos/everything.png"
              alt="Everything"
              fill
              className="object-contain object-left"
              priority
            />
          </Link>
          <p className="text-gray-400 text-xs leading-relaxed max-w-[250px]">
            The ultimate ecosystem for the next generation. Premium devices built for speed, performance, and style.
          </p>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-2">
            &copy; {new Date().getFullYear()} Everything Inc. All rights reserved.
          </p>
        </div>
        
        <div className="flex flex-col gap-4">
          <h4 className="font-bold uppercase tracking-widest text-sm mb-2">Shop</h4>
          <Link href="/product/everything-x" className="text-gray-400 hover:text-white text-xs font-medium transition-colors">Everything X</Link>
          <Link href="/product/everything-edge" className="text-gray-400 hover:text-white text-xs font-medium transition-colors">Everything Edge</Link>
          <Link href="/product/everything-lens" className="text-gray-400 hover:text-white text-xs font-medium transition-colors">Everything Lens</Link>
          <Link href="/product/everything-pods" className="text-gray-400 hover:text-white text-xs font-medium transition-colors">Everything Pods</Link>
        </div>

        <div className="flex flex-col gap-4">
          <h4 className="font-bold uppercase tracking-widest text-sm mb-2">Support</h4>
          <Link href="/profile" className="text-gray-400 hover:text-white text-xs font-medium transition-colors">Track Order</Link>
          <Link href="/contact" className="text-gray-400 hover:text-white text-xs font-medium transition-colors">Contact Us</Link>
          <Link href="/shipping-returns" className="text-gray-400 hover:text-white text-xs font-medium transition-colors">Shipping & Returns</Link>
          <Link href="/faq" className="text-gray-400 hover:text-white text-xs font-medium transition-colors">FAQ</Link>
          <Link href="/warranty" className="text-gray-400 hover:text-white text-xs font-medium transition-colors">Warranty</Link>
        </div>

        <div className="flex flex-col gap-4">
          <h4 className="font-bold uppercase tracking-widest text-sm mb-2">Legal & Info</h4>
          <Link href="/about" className="text-gray-400 hover:text-white text-xs font-medium transition-colors">About Us</Link>
          <Link href="/terms" className="text-gray-400 hover:text-white text-xs font-medium transition-colors">Terms of Use</Link>
          <Link href="/privacy" className="text-gray-400 hover:text-white text-xs font-medium transition-colors">Privacy Policy</Link>
          <Link href="/security" className="text-gray-400 hover:text-white text-xs font-medium transition-colors">Security</Link>
          <Link href="/accessibility" className="text-gray-400 hover:text-white text-xs font-medium transition-colors">Accessibility Statement</Link>
        </div>
      </div>
    </footer>
  );
}
