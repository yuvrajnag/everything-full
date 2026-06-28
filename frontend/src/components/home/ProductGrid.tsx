"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "./ProductCard";
import { CategoryNav } from "./CategoryNav";
import { performSearch } from "@/lib/searchUtils";

interface ProductGridProps {
  initialProducts?: any[];
}

export function ProductGrid({ initialProducts }: ProductGridProps = {}) {
  const searchParams = useSearchParams();
  const q = searchParams.get("q");

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [products, setProducts] = useState<any[]>(initialProducts || []);
  const [isLoading, setIsLoading] = useState(!initialProducts || initialProducts.length === 0);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) return; // Skip fetch if we already have server-rendered products!
    
    fetch("/api/proxy/products")
      .then(res => res.json())
      .then(data => {
        // The user specifically requested to use local assets instead of Cloudinary.
        const mappedData = data.map((p: any) => {
          if (p.imageUrl && p.imageUrl.includes('res.cloudinary.com')) {
             const filename = p.imageUrl.split('/').pop();
             p.imageUrl = `/products/${filename}`;
          }
          if (p.hoverImageUrl && p.hoverImageUrl.includes('res.cloudinary.com')) {
             const hoverFilename = p.hoverImageUrl.split('/').pop();
             p.hoverImageUrl = `/products/${hoverFilename}`;
          }
          return p;
        });
        
        setProducts(mappedData);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load products", err);
        setIsLoading(false);
      });
  }, [initialProducts]);

  const filteredProducts = Array.isArray(products) ? products.filter(
    (product) => selectedCategory === "All" || product.category === selectedCategory
  ) : [];

  let renderContent = null;

  if (q && Array.isArray(products) && products.length > 0) {
    const searchResults = performSearch(q, products);
    const resultIds = new Set(searchResults.map((p: any) => p.id));
    
    // Pick 4 random products not in search results
    const otherProducts = products.filter(p => !resultIds.has(p.id));
    const relatedProducts = [...otherProducts].sort(() => 0.5 - Math.random()).slice(0, 4);

    renderContent = (
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-[1400px] mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold text-white mb-6">Search Results for "{q}"</h2>
          
          {searchResults.length === 0 ? (
            <p className="text-gray-400 mb-12">No products found matching your search.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-16">
              {searchResults.map((product: any) => {
                const slug = product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return (
                  <Link href={`/product/${slug}`} key={product.id} className="block h-full">
                    <ProductCard
                      brand={product.brand}
                      tag={product.tag}
                      title={product.title}
                      description={product.description}
                      price={product.priceString}
                      imageUrl={product.imageUrl}
                      hoverImageUrl={product.hoverImageUrl}
                    />
                  </Link>
                );
              })}
            </div>
          )}

          <div className="border-t border-[#222] pt-12">
            <h3 className="text-xl font-bold text-white mb-6">You might also like</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
              {relatedProducts.map((product: any) => {
                const slug = product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return (
                  <Link href={`/product/${slug}`} key={product.id} className="block h-full">
                    <ProductCard
                      brand={product.brand}
                      tag={product.tag}
                      title={product.title}
                      description={product.description}
                      price={product.priceString}
                      imageUrl={product.imageUrl}
                      hoverImageUrl={product.hoverImageUrl}
                    />
                  </Link>
                );
              })}
            </div>
            <div className="flex justify-center pb-20">
              <Link href="/" className="px-8 py-3 bg-[#111] text-white border border-[#333] hover:bg-[#222] transition-colors rounded-sm font-semibold">
                View All Products
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    renderContent = (
      <div className="w-full flex flex-col items-center">
        <CategoryNav selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
        
        <div className="w-full max-w-[1400px] mx-auto px-4 pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="bg-[#111] animate-pulse h-[450px] w-full border border-[#222] flex flex-col justify-between">
                  <div className="w-full h-3/4 bg-[#1a1a1a]"></div>
                  <div className="p-6 space-y-3">
                    <div className="h-3 bg-[#333] w-1/3 rounded"></div>
                    <div className="h-6 bg-[#222] w-3/4 rounded"></div>
                    <div className="h-4 bg-[#222] w-1/4 rounded mt-2"></div>
                  </div>
                </div>
              ))
            ) : (
              filteredProducts.map((product) => {
                const slug = product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return (
                  <Link href={`/product/${slug}`} key={product.id} className="block h-full">
                    <ProductCard
                      brand={product.brand}
                      tag={product.tag}
                      title={product.title}
                      description={product.description}
                      price={product.priceString}
                      imageUrl={product.imageUrl}
                      hoverImageUrl={product.hoverImageUrl}
                    />
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return renderContent;
}
