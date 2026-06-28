import { products } from "@/data/products";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchaseFlow } from "@/components/product/ProductPurchaseFlow";
import { ProductHeader } from "@/components/layout/ProductHeader";
import { ProductDetailsModal } from "@/components/product/ProductDetailsModal";
import { Star } from "lucide-react";
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const res = await fetch(`${baseUrl}/products/${resolvedParams.slug}`, { cache: 'no-store' });
  if (!res.ok) {
    notFound();
  }
  const product = await res.json();
  const localProduct = products.find(p => p.id === product.id);
  const rating = localProduct?.rating || 5.0;

  const slugToPrefix: Record<string, string> = {
    "everything-x": "ex",
    "everything-edge": "ee",
    "everything-pc": "ep",
    "everything-lens": "es",
    "everything-display-x1": "edx",
    "everything-watch": "ew",
    "everything-headphones": "eh",
    "everything-keyboard-x1": "ekx",
    "everything-tab": "et",
    "everything-earphones": "eee",
    "everything-mouse-x1": "emx",
    "everything-buds": "eb",
    "everything-laptop-e1": "el",
  };

  const prefix = slugToPrefix[resolvedParams.slug];
  
  let mainImageUrl = product.imageUrl;
  if (mainImageUrl && mainImageUrl.includes('res.cloudinary.com')) {
     const filename = mainImageUrl.split('/').pop();
     mainImageUrl = `/products/${filename}`;
  }
  
  const images: string[] = [mainImageUrl];
  
  if (prefix) {
    const publicProductsDir = path.join(process.cwd(), "public", "products");
    const suffixes = ["_poster", "_f1", "_f2", "_f3"];
    for (const suffix of suffixes) {
      const candidateName = `${prefix}${suffix}.png`;
      const candidatePath = path.join(publicProductsDir, candidateName);
      if (fs.existsSync(candidatePath)) {
        images.push(`/products/${candidateName}`);
      }
    }
  }

  let shortDescription = product.description;
  let fullDetails = "";

  const catalogPath = path.join(process.cwd(), "product_descriptions", "everything-catalog.md");
  if (fs.existsSync(catalogPath)) {
    const content = fs.readFileSync(catalogPath, "utf-8");
    const sections = content.split(/^## /m);
    
    // Find the section for this specific product
    const productSection = sections.find(s => s.trim().toLowerCase().startsWith(product.title.toLowerCase()));
    
    if (productSection) {
      // Extract Short Description
      const shortMatch = productSection.match(/### Short Description\s*\n+([\s\S]*?)(?=\n### Specifications)/i);
      if (shortMatch) {
         shortDescription = shortMatch[1].trim();
      }
      
      // Extract Specifications
      const specsIndex = productSection.search(/### Specifications/i);
      if (specsIndex !== -1) {
         fullDetails = productSection.substring(specsIndex).replace(/### Specifications/i, '').trim();
      }
    }
  }

  // Determine series logo
  let seriesLogoUrl = "/logos/everything.png";
  if (localProduct?.brand === "edge") {
    seriesLogoUrl = "/logos/edge.png";
  } else if (localProduct?.brand === "extreme") {
    seriesLogoUrl = "/logos/eXtreme.png";
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col items-center">
      {/* Header */}
      <ProductHeader />

      <div className="flex-1 w-full flex justify-center px-8 pb-20 pt-4">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* Left Side - Image Gallery */}
        <ProductGallery title={product.title} images={images} />

        {/* Right Side - Product Details */}
        <div className="flex flex-col py-4">
          <h1 className="text-4xl font-bold mb-4 tracking-wide">{product.title}</h1>
          
          {product.tag !== "UPCOMING" && (
            <div className="flex items-center gap-2 mb-6">
              <div className="flex text-[#FFD700]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < Math.round(rating) ? "currentColor" : "none"} />
                ))}
              </div>
              <span className="text-sm font-medium">{rating.toFixed(1)}</span>
            </div>
          )}

          <ProductPurchaseFlow product={product} />

          {/* Detailed Features Modal */}
          <ProductDetailsModal 
            shortDescription={shortDescription}
            fullDetails={fullDetails}
            productTitle={product.title}
            seriesLogoUrl={seriesLogoUrl}
          />

        </div>
        </div>
      </div>
    </div>
  );
}
