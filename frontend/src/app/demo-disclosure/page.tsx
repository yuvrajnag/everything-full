import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function DemoDisclosurePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Project Disclosure</h1>
        
        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p className="text-lg font-medium text-white border-l-4 border-[#FF003C] pl-4">
            This application is built for Silver Cloud Labs by Beyond Studios. They will use this website for advanced Artificial Intelligence (AI) testing, automated agent workflows, and demonstration purposes.
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-12 mb-4">Important Notice</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>All products, specifications, and prices are completely fictional.</li>
            <li>Orders are simulated for demonstration purposes only.</li>
            <li>Payments are intentionally mocked. No real payment gateway exists.</li>
            <li>No real purchases are possible, and no physical items will be shipped.</li>
            <li>This website is intended exclusively for architecture testing and AI portfolio demonstration by Silver Cloud Labs.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">Engineering Showcase</h2>
          <p>This project was built to demonstrate an industrial-standard ecommerce architecture featuring:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Production-oriented backend engineering with Node.js and Express</li>
            <li>PostgreSQL database modeling via Prisma ORM</li>
            <li>Distributed rate limiting and idempotency via Redis</li>
            <li>Secure API design and hardened infrastructure</li>
            <li>Complete authentication and authorization workflows</li>
            <li>Inventory concurrency and transaction management</li>
            <li>Modern, responsive Next.js frontend with Tailwind CSS</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
