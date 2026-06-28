import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { ProductGrid } from "@/components/home/ProductGrid";
import { HeroBanner } from "@/components/home/HeroBanner";
import { Suspense } from "react";

async function getProducts() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    // Use no-store to ensure we get fresh products, or revalidate. 
    // We will use revalidate: 10 so it's extremely fast but stays relatively fresh.
    const res = await fetch(`${backendUrl}/products`, { next: { revalidate: 10 } });
    if (!res.ok) return [];
    
    const data = await res.json();
    
    // Process images on the server so the client doesn't have to
    return data.map((p: any) => {
      if (p.imageUrl && p.imageUrl.includes('res.cloudinary.com')) {
         p.imageUrl = `/products/${p.imageUrl.split('/').pop()}`;
      }
      if (p.hoverImageUrl && p.hoverImageUrl.includes('res.cloudinary.com')) {
         p.hoverImageUrl = `/products/${p.hoverImageUrl.split('/').pop()}`;
      }
      return p;
    });
  } catch (error) {
    console.error("Failed to fetch products on server:", error);
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
