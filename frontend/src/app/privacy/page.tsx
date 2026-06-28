import { Navbar } from "@/components/layout/Navbar";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <div className="bg-[#111] border border-[#FF003C] p-6 mb-8">
            <h3 className="text-[#FF003C] font-bold uppercase tracking-widest mb-2">Demonstration Only</h3>
            <p className="text-sm">
              This is a demonstration project. Do not enter real personal, financial, or sensitive information. No real financial transactions occur.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Data Collection in a Demo Environment</h2>
          <p>
            As a software engineering portfolio piece, this application collects simulated data strictly to demonstrate account creation, cart management, and order processing workflows. Any information entered into this system should not be considered production data.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Financial Information</h2>
          <p>
            <strong>No payment information is collected.</strong> The checkout process utilizes an intentionally mocked payment provider to simulate order completion. Never enter real credit card or banking information into this application.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. Data Retention</h2>
          <p>
            Database resets and migrations may occur without notice as part of ongoing development and testing. Any test accounts, simulated orders, or simulated addresses you create may be deleted at any time.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Cookies and Local Storage</h2>
          <p>
            This application uses secure, HTTP-only cookies to demonstrate authentication sessions and local storage to persist cart state across page reloads. These are standard engineering practices implemented here purely for technical demonstration.
          </p>
        </div>
      </main>
      </div>
  );
}
