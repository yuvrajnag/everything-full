import { Navbar } from "@/components/layout/Navbar";

export default function WarrantyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Warranty</h1>

        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p className="text-lg text-white">
            Every EVERYTHING device is covered by a [WARRANTY PERIOD] limited hardware warranty from
            the date of delivery.
          </p>

          <h2 className="text-2xl font-bold text-white mt-12 mb-4">What is covered</h2>
          <p>
            Manufacturing defects and hardware faults that appear under normal use. If your device
            fails within the warranty period we will repair it, replace it, or refund it, at our
            option and at no cost to you.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">What is not covered</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Accidental damage, liquid damage, and normal cosmetic wear.</li>
            <li>Damage from use outside the product&apos;s documented operating conditions.</li>
            <li>Devices opened, modified or repaired by anyone other than us or an authorised partner.</li>
            <li>Consumable parts, where the product documentation identifies them as such.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Making a claim</h2>
          <p>
            Email [SUPPORT EMAIL] with your order number and a description of the fault. We will
            respond within [RESPONSE WINDOW] and arrange collection if the device needs to come back
            to us. Keep your order confirmation email — it is your proof of purchase.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Your statutory rights</h2>
          <p>
            This warranty is in addition to, and does not limit, your rights under the Consumer
            Protection Act, 2019 and other applicable Indian consumer law.
          </p>
        </div>
      </main>
    </div>
  );
}
