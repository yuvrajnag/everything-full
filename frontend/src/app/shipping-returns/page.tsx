import { Navbar } from "@/components/layout/Navbar";

export default function ShippingReturnsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Shipping &amp; Returns</h1>

        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <div className="bg-[#111] border border-[#333] p-6 mb-8">
            <h3 className="text-white font-bold uppercase tracking-widest mb-2">India only</h3>
            <p className="text-sm">
              We currently ship within India. Shipping is free on every order, and all prices are in
              Indian Rupees inclusive of applicable taxes.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Dispatch and delivery</h2>
          <p>
            Orders are picked and dispatched within [DISPATCH WINDOW] working days. Once your order
            leaves our warehouse you will receive a dispatch email, and the status on your order page
            moves to <strong>Shipped</strong>. Typical delivery is
            [DELIVERY ESTIMATE] working days from dispatch, depending on your PIN code.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Order statuses</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Awaiting payment</strong> — your order is reserved but payment has not completed. You can finish paying from the order page. Unpaid orders are released after 30 minutes and the stock returned.</li>
            <li><strong>Paid</strong> — payment captured. For Cash on Delivery, <strong>Confirmed</strong>{" "}means the order is reserved and you pay on delivery.</li>
            <li><strong>Shipped</strong> — dispatched and on its way.</li>
            <li><strong>Delivered</strong> — delivery completed.</li>
            <li><strong>Cancelled</strong> — cancelled by you or by us, with any payment refunded.</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Cancelling an order</h2>
          <p>
            You can cancel from your order page at any time before it ships — no reason needed. If
            you paid by card or UPI, the refund is issued to your original payment method as part of
            the cancellation, and the reserved stock goes straight back on sale.
          </p>
          <p>
            If for any reason the refund cannot be issued, we do not cancel the order: it stays
            active and we contact you, so an order is never closed without your money coming back.
            Refunds typically reach your account within 5&ndash;7 business days, depending on your
            bank. Cash on Delivery orders have nothing to refund, since nothing was charged.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Returns</h2>
          <p>
            Once an order has shipped it can no longer be cancelled, but you can return it within
            [RETURN WINDOW] days of delivery if it is unused and in its original packaging. Email
            [SUPPORT EMAIL] with your order number and we will arrange collection.
          </p>
          <p>
            Damaged or faulty items are covered regardless of the return window — see
            {" "}<a href="/warranty" className="text-white underline underline-offset-4">Warranty</a>.
            Refunds on returns are issued once the item reaches us and passes inspection.
          </p>
        </div>
      </main>
    </div>
  );
}
