import { Navbar } from "@/components/layout/Navbar";

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Frequently Asked Questions</h1>
        
        <div className="space-y-8">
          <div className="border-b border-[#333] pb-6">
            <h3 className="text-xl font-bold mb-3">Why are payments mocked?</h3>
            <p className="text-gray-400">
              This application is an engineering built for testing and demo purposes for Silver Cloud Labs by Beyond Studios. They will test this website for something.</p>
          </div>

          <div className="border-b border-[#333] pb-6">
            <h3 className="text-xl font-bold mb-3">Can I buy these products?</h3>
            <p className="text-gray-400">
              No. "Everything" is a fictional brand created exclusively for this demonstration. The products, specifications, and imagery are mockups designed to simulate a high-end tech company.
            </p>
          </div>

          <div className="border-b border-[#333] pb-6">
            <h3 className="text-xl font-bold mb-3">What happens when I place an order?</h3>
            <p className="text-gray-400">
              Your order is recorded in the PostgreSQL database, inventory is decremented within an atomic transaction, and a mocked payment is processed. You can track this order in your user dashboard, and background jobs will simulate shipping and delivery over the course of a few minutes.
            </p>
          </div>

          <div className="border-b border-[#333] pb-6">
            <h3 className="text-xl font-bold mb-3">What technology stack is used?</h3>
            <p className="text-gray-400">
              The frontend is Next.js with Tailwind CSS. The backend is Node.js/Express.js. The database is PostgreSQL (via Prisma). Redis is utilized for caching and distributed rate limiting.
            </p>
          </div>
        </div>
      </main>
      </div>
  );
}
