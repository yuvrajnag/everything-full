import { Navbar } from "@/components/layout/Navbar";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Terms of Use</h1>
        
        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p className="text-lg font-medium text-white">
            Please read these terms carefully before interacting with this demonstration application.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Educational and Portfolio Use</h2>
          <p>
            This website is provided strictly for educational and portfolio demonstration purposes. It is not a commercial entity. By accessing the site, you acknowledge that you are interacting with a software engineering project.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">No Commercial Purchases</h2>
          <p>
            No real commercial transactions take place on this platform. The "Everything" brand, all associated products, specifications, and prices are entirely fictional. The ordering system is mocked to demonstrate state management, backend API architecture, and database operations.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">No Legal Contract of Sale</h2>
          <p>
            Completing the simulated checkout process does not constitute a legal contract of sale. You will not be charged, and no goods or services will be delivered.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Disclaimer of Warranty</h2>
          <p>
            The software is provided "as is", without warranty of any kind, express or implied. The creator assumes no liability for any disruption, data loss, or other issues resulting from the use of this demonstration environment.
          </p>
        </div>
      </main>
      </div>
  );
}
