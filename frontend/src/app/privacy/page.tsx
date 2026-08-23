import { Navbar } from "@/components/layout/Navbar";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Privacy Policy</h1>

        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p className="text-sm text-gray-500">Last updated: [DATE]</p>

          <p className="text-lg text-white">
            This policy explains what EVERYTHING collects when you shop with us, why we collect it,
            and what we do with it. It applies to this website and the orders placed through it.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Who we are</h2>
          <p>
            EVERYTHING is operated by [COMPANY LEGAL NAME], [REGISTERED ADDRESS].
            For any privacy question, or to exercise the rights described below,
            contact us at [PRIVACY CONTACT EMAIL].
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. What we collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Account details.</strong>{" "}When you sign in with Google we receive your name, email address and profile picture. We do not receive your Google password.</li>
            <li><strong>Order details.</strong>{" "}The shipping address, phone number and email you enter at checkout, plus the items, prices and status of each order.</li>
            <li><strong>Technical data.</strong>{" "}Standard server logs, and a session cookie that keeps you signed in.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. Payment information</h2>
          <p>
            <strong>We never see or store your card details.</strong>{" "}Card and UPI payments are
            processed by Razorpay, and the details are entered directly into Razorpay&apos;s own
            secure payment window. Your card number, expiry date and CVV never reach our servers.
          </p>
          <p>
            What we do store is a record of each payment: the amount, its status, and the reference
            ids Razorpay gives us so we can match a payment to your order and issue a refund if you
            cancel. Razorpay processes your payment data as an independent controller under its own
            privacy policy.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Why we use it</h2>
          <p>
            To take and fulfil your order, to take payment and issue refunds, to send you the
            transactional emails described below, and to keep records we are required to keep for
            tax and accounting purposes.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. Emails we send</h2>
          <p>
            We send order confirmations, cancellation and refund notices, and notices when a payment
            fails. These are transactional — they are part of your order, not marketing, and we do
            not send promotional email without asking you first.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">6. Who we share it with</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Razorpay</strong> — to process payments and refunds.</li>
            <li><strong>Our email provider</strong> — to deliver the transactional emails above.</li>
            <li><strong>Delivery partners</strong> — the shipping address and phone number needed to deliver your order.</li>
          </ul>
          <p>We do not sell your personal data.</p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">7. How long we keep it</h2>
          <p>
            Order and payment records are kept for [RETENTION PERIOD] to meet tax and accounting
            obligations. You can ask us to delete your account at any time; we will remove your
            profile while retaining the order records we are legally required to keep.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">8. Your rights</h2>
          <p>
            You can ask for a copy of the personal data we hold about you, ask us to correct it, or
            ask us to delete it. Write to [PRIVACY CONTACT EMAIL] and we will respond within
            [RESPONSE WINDOW].
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">9. Cookies</h2>
          <p>
            We use a secure, HTTP-only cookie to keep you signed in, and your browser&apos;s local
            storage to remember your cart and saved shipping details between visits. Clearing your
            browser data removes both.
          </p>
        </div>
      </main>
    </div>
  );
}
