import { Navbar } from "@/components/layout/Navbar";

export default function WarrantyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Warranty Information</h1>
        
        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p className="text-lg text-white">
            This page exists solely to demonstrate the structural content of a realistic ecommerce experience.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">No Actual Warranty</h2>
          <p>
            Because the "Everything" brand and all products listed on this application are entirely fictional, no warranty exists for any product.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Simulated Premium Coverage</h2>
          <p>
            In the context of the fictional brand, all "Everything" devices would theoretically be covered by a 2-year limited hardware warranty. However, this text serves only as UI filler to complete the portfolio demonstration. 
          </p>
        </div>
      </main>
      </div>
  );
}
