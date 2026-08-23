import { Navbar } from "@/components/layout/Navbar";

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Accessibility</h1>

        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p className="text-lg text-white">
            We want everyone to be able to browse and buy from EVERYTHING. We aim to meet WCAG 2.1
            Level AA across the site.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">What we have done</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Semantic structure.</strong>{" "}Proper landmarks and heading order so screen readers can navigate the page.</li>
            <li><strong>Keyboard access.</strong>{" "}Every interactive element is reachable by keyboard and shows a visible focus state.</li>
            <li><strong>Contrast.</strong>{" "}Text is set at high contrast against our dark background.</li>
            <li><strong>Alternative text.</strong>{" "}Product images carry descriptive alt text.</li>
            <li><strong>Clear errors.</strong>{" "}Checkout problems are announced to assistive technology and shown in context, not as pop-ups.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Known gaps</h2>
          <p>
            Some animated components — notably the homepage carousel and the product gallery — do
            not yet fully meet Level AA. We are working on them.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Tell us about a problem</h2>
          <p>
            If something on this site is difficult or impossible for you to use, email
            [ACCESSIBILITY CONTACT EMAIL]. Describe the page and what went wrong, and we will
            respond within [RESPONSE WINDOW]. If you cannot complete an order because of an
            accessibility barrier, contact us and we will place it for you.
          </p>
        </div>
      </main>
    </div>
  );
}
