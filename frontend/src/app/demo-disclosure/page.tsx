import { redirect } from "next/navigation";

/**
 * The project-disclosure page described this site as a demonstration with
 * mocked payments. That is no longer true — checkout takes real payments
 * through Razorpay — so the page has been retired and its footer slot now
 * points at /terms.
 */
export default function DemoDisclosurePage() {
  redirect("/terms");
}
