import { Navbar } from "@/components/layout/Navbar";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Contact</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-white">Customer support</h2>
            <p className="text-gray-400">
              Questions about an order, a return or a warranty claim? Email us with your order
              number and we will get back to you within [RESPONSE WINDOW].
            </p>

            <div className="bg-[#111] border border-[#333] p-6 mt-4 space-y-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-1">Email</p>
                <p className="text-lg text-white">[SUPPORT EMAIL]</p>
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-1">Phone</p>
                <p className="text-lg text-white">[SUPPORT PHONE]</p>
                <p className="text-xs text-gray-500 mt-1">[SUPPORT HOURS]</p>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              You can also track and cancel orders yourself from your{" "}
              <a href="/profile" className="text-white underline underline-offset-4">account</a>.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-white">Registered office</h2>
            <div className="space-y-4">
              <div className="border-l-2 border-[#333] pl-4">
                <p className="text-sm font-bold text-white">[COMPANY LEGAL NAME]</p>
                <p className="text-sm text-gray-500 whitespace-pre-line">[REGISTERED ADDRESS]</p>
              </div>
              <div className="border-l-2 border-[#333] pl-4">
                <p className="text-sm font-bold text-white">Business identifiers</p>
                <p className="text-sm text-gray-500">[CIN / GSTIN]</p>
              </div>
            </div>

            <div className="border-l-2 border-[#333] pl-4">
              <p className="text-sm font-bold text-white">Security reports</p>
              <p className="text-sm text-gray-500">[SECURITY CONTACT EMAIL]</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
