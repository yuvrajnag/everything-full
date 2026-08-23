import { Navbar } from "@/components/layout/Navbar";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Security</h1>

        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p className="text-lg text-white">
            How we protect your account, your order and your money.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">Your payment details</h2>
          <p>
            Card and UPI details are entered directly into Razorpay&apos;s secure payment window and
            never pass through our servers. We do not store card numbers, expiry dates or CVVs —
            there is nothing on our side for an attacker to take.
          </p>
          <p>
            Every payment is verified server-side with an HMAC-SHA256 signature before an order is
            marked paid, so a payment confirmation cannot be forged or replayed against a different
            order.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Your account</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Sign-in.</strong>{" "}Authentication is handled by Google. We never see your Google password.</li>
            <li><strong>Sessions.</strong>{" "}Kept in secure, HTTP-only cookies with CSRF protection, so they cannot be read by scripts running in your browser.</li>
            <li><strong>Isolation.</strong>{" "}Orders are scoped to the account that placed them. Your identity is established on our server from your session — it can never be supplied or altered by the browser.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Your order</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Server-side pricing.</strong>{" "}Totals are calculated on our servers from our own catalogue, so the amount charged always matches what you were shown.</li>
            <li><strong>Atomic stock.</strong>{" "}Inventory is reserved inside a database transaction, so two people cannot buy the same last unit.</li>
            <li><strong>No duplicate charges.</strong>{" "}Idempotency keys mean a double-click or a network retry resolves to the same order rather than creating a second one.</li>
            <li><strong>Refund integrity.</strong>{" "}A cancellation only completes once the refund has actually been issued by the payment provider.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Our infrastructure</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Strict Content Security Policy, HSTS and frameguard headers.</li>
            <li>Rate limiting on checkout and payment endpoints to block brute-force and scraping.</li>
            <li>All input validated against strict schemas before it reaches business logic.</li>
            <li>Parameterised database queries throughout, preventing SQL injection.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Reporting a vulnerability</h2>
          <p>
            If you believe you have found a security issue, please email [SECURITY CONTACT EMAIL]
            rather than disclosing it publicly. We will acknowledge your report within
            [RESPONSE WINDOW].
          </p>
        </div>
      </main>
    </div>
  );
}
