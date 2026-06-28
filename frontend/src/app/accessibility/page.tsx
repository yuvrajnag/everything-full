import { Navbar } from "@/components/layout/Navbar";

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Accessibility Statement</h1>
        
        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p className="text-lg text-white">
            While this is a fictional built for testing and demo purposes for Silver Cloud Labs by Beyond Studios. They will test this website for something.</p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">Implemented Features</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Semantic HTML:</strong> Use of proper landmarks (`&lt;main&gt;`, `&lt;nav&gt;`, `&lt;footer&gt;`) for screen reader navigation.</li>
            <li><strong>Contrast Ratios:</strong> High contrast text against dark backgrounds ensures readability.</li>
            <li><strong>Alt Text:</strong> Product images are provided with descriptive alternative text where possible.</li>
            <li><strong>Focus Management:</strong> Interactive elements maintain visible focus states for keyboard navigation.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Limitations</h2>
          <p>
            As a fast-paced demonstration project, some complex custom UI components (such as highly animated image carousels) may not achieve full compliance with all WCAG 2.1 AA standards.
          </p>
        </div>
      </main>
      </div>
  );
}
