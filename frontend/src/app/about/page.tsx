import { Navbar } from "@/components/layout/Navbar";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">About Us</h1>

        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p className="text-lg text-white">
            EVERYTHING builds premium consumer technology — phones, laptops, wearables and audio —
            designed around a single idea: one vision, infinite possibilities.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">Our range</h2>
          <p>
            Our products are organised into two series. <strong>Edge</strong>{" "}is built for everyday
            use: light, efficient and refined. <strong>eXtreme</strong>{" "}is built for performance:
            our fastest silicon, our best cooling, and the hardware enthusiasts ask for.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">How we sell</h2>
          <p>
            We sell directly, with no retail markup and no middlemen. Shipping is free across India,
            every device carries a [WARRANTY PERIOD] limited hardware warranty, and you can cancel
            any order for a full refund right up until it ships.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">Company details</h2>
          <p>
            EVERYTHING is operated by [COMPANY LEGAL NAME], registered at [REGISTERED ADDRESS].
            [CIN / GSTIN]. For support, email [SUPPORT EMAIL].
          </p>
        </div>
      </main>
    </div>
  );
}
