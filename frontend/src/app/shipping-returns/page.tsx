import { Navbar } from "@/components/layout/Navbar";

export default function ShippingReturnsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Shipping & Returns</h1>
        
        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <div className="bg-[#111] border border-[#333] p-6 mb-8">
            <h3 className="text-white font-bold uppercase tracking-widest mb-2">Simulated Logistics</h3>
            <p className="text-sm">
              As a built for testing and demo purposes for Silver Cloud Labs by Beyond Studios. They will test this website for something.</p>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Order Simulation Workflow</h2>
          <p>
            When an order is placed on this platform, the backend immediately reserves inventory through an atomic database transaction. The order enters a `PENDING` state. Once the mocked payment succeeds, it transitions to `PAID`.
          </p>
          <p>
            A background process continuously monitors paid orders and simulates logistics by transitioning statuses automatically:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>PAID to SHIPPED:</strong> Occurs automatically 1 minute after purchase.</li>
            <li><strong>SHIPPED to DELIVERED:</strong> Occurs automatically 5 minutes after purchase.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Returns Demonstration</h2>
          <p>
            No real returns process exists. However, the architecture supports order cancellation. Cancelling an order via the API releases the reserved inventory back into the available stock pool and marks the mock payment as `REFUNDED`, demonstrating proper compensating transactions.
          </p>
        </div>
      </main>
      </div>
  );
}
