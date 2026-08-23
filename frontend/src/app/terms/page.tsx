import { Navbar } from "@/components/layout/Navbar";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Terms of Sale</h1>

        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p className="text-sm text-gray-500">Last updated: [DATE]</p>

          <p className="text-lg font-medium text-white">
            These terms govern your purchase of products from EVERYTHING, operated by
            [COMPANY LEGAL NAME]. Please read them before placing an order.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Where we ship</h2>
          <p>
            We currently sell and ship only within India, and all prices are shown in Indian Rupees
            (INR) inclusive of applicable taxes.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Placing an order</h2>
          <p>
            Adding items to your cart is not an order. When you complete checkout we reserve the
            stock and create your order, but a contract of sale is formed only once we confirm the
            order — after payment is captured, or after we confirm a Cash on Delivery order.
          </p>
          <p>
            If an item sells out between you adding it to the cart and completing checkout, we will
            tell you at checkout and take no payment.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. Prices and payment</h2>
          <p>
            The price you pay is the price shown for the exact configuration you select, confirmed
            on the checkout summary before you pay. We calculate the total on our own servers, so
            the amount charged always matches what you were shown.
          </p>
          <p>
            We accept cards and UPI through Razorpay, and Cash on Delivery. Card and UPI details are
            entered in Razorpay&apos;s secure window and never reach us. For Cash on Delivery,
            nothing is charged until the order is delivered.
          </p>
          <p>
            If we discover a genuine pricing error before dispatch, we will contact you and either
            honour the price or cancel and refund the order in full. You are never charged the
            difference without agreeing to it.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Cancellation and refunds</h2>
          <p>
            You can cancel from your order page at any time before it ships. If you paid online, we
            issue the refund to your original payment method as part of the cancellation — if for
            any reason the refund cannot be issued, the order stays active and we contact you rather
            than cancelling without returning your money.
          </p>
          <p>
            Once an order has shipped it can no longer be cancelled; see
            {" "}<a href="/shipping-returns" className="text-white underline underline-offset-4">Shipping &amp; Returns</a>{" "}
            for how to return it instead.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. Your account</h2>
          <p>
            You need an account to place an order. Keep your sign-in credentials secure — you are
            responsible for orders placed from your account. Tell us immediately at
            [SUPPORT EMAIL] if you believe someone else has used it.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">6. Liability</h2>
          <p>
            Nothing in these terms limits your statutory rights as a consumer under the Consumer
            Protection Act, 2019, or excludes liability we cannot lawfully exclude. Subject to that,
            our liability for any order is limited to the amount you paid for it.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">7. Governing law</h2>
          <p>
            These terms are governed by the laws of India, and the courts of
            [CITY / JURISDICTION] have exclusive jurisdiction over any dispute.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">8. Contact</h2>
          <p>[COMPANY LEGAL NAME], [REGISTERED ADDRESS]. Support: [SUPPORT EMAIL].</p>
        </div>
      </main>
    </div>
  );
}
