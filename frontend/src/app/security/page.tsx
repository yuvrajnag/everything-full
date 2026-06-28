import { Navbar } from "@/components/layout/Navbar";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Security Architecture</h1>
        
        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p className="text-lg text-white">
            This platform implements industrial-grade security practices to demonstrate production-readiness, despite being a fictional built for testing and demo purposes for Silver Cloud Labs by Beyond Studios. They will test this website for something.</p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">Infrastructure Security</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Helmet Headers:</strong> Strict Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), and frameguard protections applied at the API gateway.</li>
            <li><strong>Distributed Rate Limiting:</strong> Redis-backed rate limiting protects against DDoS attacks, brute-force attempts, and automated API scraping.</li>
            <li><strong>Idempotency:</strong> Redis-backed idempotency keys ensure checkout transactions cannot be duplicated by network retries or malicious concurrent requests.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Data Protection</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Parameterized Queries:</strong> Prisma ORM prevents SQL injection by utilizing prepared statements and parameterized queries for all database interactions.</li>
            <li><strong>Authentication:</strong> NextAuth.js manages secure, HTTP-only session cookies with CSRF protection built-in.</li>
            <li><strong>Input Validation:</strong> Zod schemas strictly validate all incoming API payloads, ensuring malicious or malformed data is rejected before reaching business logic.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">No Sensitive Data</h2>
          <p>
            Because this is a demonstration environment, no real sensitive financial data (credit cards, bank accounts) is ever requested, transmitted, or stored. 
          </p>
        </div>
      </main>
      </div>
  );
}
