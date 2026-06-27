export interface PaymentProvider {
  /**
   * Initializes a payment intent/order on the provider's side
   */
  createOrder(amount: number, currency: string, receiptId: string): Promise<{ id: string, status: string, amount: number }>;
  
  /**
   * Verifies the payment signature/webhook
   */
  verifyPayment(payload: any, signature: string): Promise<boolean>;
  
  /**
   * Process a refund
   */
  refundPayment(paymentId: string, amount?: number): Promise<{ id: string, status: string }>;
}
