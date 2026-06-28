import { Navbar } from "@/components/layout/Navbar";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">About The Project</h1>
        
        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p className="text-lg text-white">
            "Everything" is a fictional premium technology brand created as a full-stack software engineering built for testing and demo purposes for Silver Cloud Labs by Beyond Studios. They will test this website for something.</p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">The Purpose</h2>
          <p>
            The purpose of this project is to showcase a robust, production-ready ecommerce architecture. While the frontend presents a sleek, consumer-facing premium brand, the backend is engineered to handle real-world complexities like inventory race conditions, distributed rate limiting, and secure transaction processing.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">Architecture Decisions</h2>
          <p>
            The system is built on a decoupled architecture:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Frontend:</strong> Next.js App Router for optimal SEO and SSR capabilities, utilizing Tailwind CSS for strict design system enforcement.</li>
            <li><strong>Backend:</strong> Express.js REST API providing strict validation, rate limiting, and business logic encapsulation.</li>
            <li><strong>Database:</strong> PostgreSQL managed via Prisma ORM for type-safe database queries and atomic transactions.</li>
            <li><strong>Caching & State:</strong> Redis is utilized for idempotency keys, distributed rate limiting, and caching frequently accessed product data.</li>
            <li><strong>Media:</strong> Cloudinary for optimized, responsive media delivery.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">Production Engineering Principles</h2>
          <p>
            This project emphasizes defense-in-depth security, strict TypeScript typing across the stack, centralized structured error logging, and resilient infrastructure design meant to scale horizontally.
          </p>
        </div>
      </main>
      </div>
  );
}
