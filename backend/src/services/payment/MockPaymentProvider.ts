import { PaymentProvider } from './PaymentProvider';
import * as crypto from 'crypto';

export class MockPaymentProvider implements PaymentProvider {
  async createOrder(amount: number, currency: string, receiptId: string): Promise<{ id: string, status: string, amount: number }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      id: `mock_order_${crypto.randomBytes(8).toString('hex')}`,
      status: 'created',
      amount
    };
  }

  async verifyPayment(payload: any, signature: string): Promise<boolean> {
    // In a real provider (like Razorpay), we verify the HMAC-SHA256 signature here.
    // For our mock, if the signature matches a dummy check, we return true.
    return signature === 'mock_valid_signature';
  }

  async refundPayment(paymentId: string, amount?: number): Promise<{ id: string, status: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      id: `mock_refund_${crypto.randomBytes(8).toString('hex')}`,
      status: 'processed'
    };
  }
}
