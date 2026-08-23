import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { ProductGrid } from "@/components/home/ProductGrid";
import { HeroBanner } from "@/components/home/HeroBanner";
import { Suspense } from "react";

/**
 * Server-side catalogue fetch for the first paint. The API already returns
 * local image paths and slugs, so nothing needs rewriting here.
 *
 * On failure this returns an empty list and the client component re-fetches
 * through the proxy, showing an error if that fails too.
 */
async function getProducts() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const res = await fetch(`${backendUrl}/products`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to fetch products on the server:', error);
    return [];
  }
}

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Navbar />
      
      <main className="flex-1 w-full flex flex-col items-center mt-2">
        {/* Hero Banner Interactive Carousel */}
        <Suspense fallback={<div className="w-full aspect-[21/6] bg-[#111] animate-pulse"></div>}>
          <HeroBanner />
        </Suspense>

        {/* Product Grid */}
        <Suspense fallback={<div className="text-white p-8">Loading products...</div>}>
          <ProductGrid initialProducts={products} />
        </Suspense>
      </main>
    </div>
  );
}
