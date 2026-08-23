import { Navbar } from "@/components/layout/Navbar";

const FAQS = [
  {
    q: "How do I pay?",
    a: "We accept credit and debit cards, UPI, and Cash on Delivery. Card and UPI payments go through Razorpay — you enter your details in Razorpay's own secure window, and they never reach our servers. With Cash on Delivery you pay the courier when your order arrives.",
  },
  {
    q: "Is my card information safe?",
    a: "We never see or store your card number, expiry date or CVV. Those go directly to Razorpay, a PCI-DSS compliant payment processor. All we keep is the amount, the payment status, and a reference id so we can match a payment to your order and refund it if you cancel.",
  },
  {
    q: "Where do you ship, and how much does it cost?",
    a: "We ship anywhere in India, and shipping is free on every order. All prices are shown in Indian Rupees inclusive of applicable taxes.",
  },
  {
    q: "Can I cancel my order?",
    a: "Yes, any time before it ships, from your order page — no reason needed. If you paid online, the refund is issued to your original payment method as part of the cancellation and normally reaches you within 5–7 business days. If an order has already shipped you can return it instead.",
  },
  {
    q: "My payment failed but I think I was charged. What now?",
    a: "If a payment is declined we do not confirm the order, and no money is taken. If a charge did go through, our system reconciles it automatically and your order will move to Paid within a few minutes. If it does not, email us with the payment reference shown on screen and we will sort it out.",
  },
  {
    q: "What happens after I place an order?",
    a: "We reserve your items immediately and take payment. You will get a confirmation email straight away, and you can follow the order's progress from Awaiting payment through Paid, Shipped and Delivered on your order page at any time.",
  },
  {
    q: "An item I wanted is out of stock. Will it come back?",
    a: "Product pages show live availability, so what you see is what is genuinely in stock. Items marked Coming soon are not yet on sale. We do not currently offer restock notifications.",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex flex-col">
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-6 py-24 flex-1">
        <h1 className="text-4xl font-black uppercase tracking-widest mb-10">Frequently Asked Questions</h1>

        <div className="space-y-8">
          {FAQS.map((item) => (
            <div key={item.q} className="border-b border-[#333] pb-6">
              <h3 className="text-xl font-bold mb-3">{item.q}</h3>
              <p className="text-gray-400">{item.a}</p>
            </div>
          ))}
        </div>

        <p className="text-gray-500 text-sm mt-12">
          Still stuck? Email us at [SUPPORT EMAIL] and we will get back to you.
        </p>
      </main>
    </div>
  );
}
