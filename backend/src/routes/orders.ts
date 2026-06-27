import { Router } from 'express';
import { prisma } from '../db';
import { OrderStatus } from '@prisma/client';
import { MockPaymentProvider } from '../services/payment/MockPaymentProvider';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { requireInternalSecret } from '../middleware/auth';

const router = Router();
const paymentProvider = new MockPaymentProvider();

// Rate limiters
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: { error: 'Too many orders created, please try again later.' }
});

const actionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});

// All order routes require the internal secret (proxy)
router.use(requireInternalSecret);

const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    priceAtPurchase: z.number().optional()
  })).min(1),
  paymentMethod: z.enum(['card', 'upi', 'cod']),
  shippingAddress: z.any()
});

router.post('/', checkoutLimiter, async (req, res) => {
  try {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error });
      return;
    }
    const { items, paymentMethod, shippingAddress } = parsed.data;
    const userId = req.headers['x-user-id'] as string | undefined;
    
    // Server-side price calculation and variant lookup
    let calculatedTotal = 0;
    const orderItemsData: { variantId: string; quantity: number; priceAtPurchase: number }[] = [];
    
    for (const item of items) {
      // Find the product and its default variant
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: { include: { inventory: true } } }
      });
      
      if (!product || product.variants.length === 0) {
        res.status(400).json({ error: `Product ${item.productId} not found or missing variants` });
        return;
      }
      
      const defaultVariant = product.variants[0];
      if (!defaultVariant) {
        res.status(400).json({ error: `Product variant not found` });
        return;
      }

      const itemPrice = defaultVariant.price;
      calculatedTotal += itemPrice * item.quantity;
      
      orderItemsData.push({
        variantId: defaultVariant.id,
        quantity: item.quantity,
        priceAtPurchase: itemPrice
      });
    }

    // 1. Transaction to reserve inventory atomically and create pending order
    const order = await prisma.$transaction(async (tx) => {
      // Reserve inventory atomically
      for (const item of orderItemsData) {
        const result = await tx.$executeRaw`
          UPDATE "Inventory" 
          SET "reserved" = "reserved" + ${item.quantity}
          WHERE "variantId" = ${item.variantId} 
          AND ("stockCount" - "reserved") >= ${item.quantity}
        `;
        
        if (result === 0) {
          throw new Error(`Overselling prevented: Not enough stock for variant ${item.variantId}`);
        }
      }
      
      // Create Order
      const newOrder = await tx.order.create({
        data: {
          totalAmount: calculatedTotal,
          status: 'PENDING',
          userId: userId || null,
          items: {
            create: orderItemsData
          }
        },
        include: { items: true }
      });
      
      return newOrder;
    });

    // 2. Initialize Payment Provider
    const payment = await paymentProvider.createOrder(calculatedTotal, 'INR', order.id);
    
    // 3. Save Payment Record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'MOCK',
        providerOrderId: payment.id,
        amount: calculatedTotal,
        status: 'PENDING'
      }
    });

    // 4. If COD, auto-confirm order (simulate flow)
    if (paymentMethod === 'cod') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID } // COD means processing/confirmed
      });
    }

    res.json(order);
  } catch (error: any) {
    console.error("Order creation error:", error);
    res.status(400).json({ error: 'Failed to create order', details: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const role = req.headers['x-user-role'] as string;

    if (!userId && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const where = (role === 'ADMIN' || role === 'SUPER_ADMIN') ? {} : { userId };

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { variant: { include: { product: { include: { images: true } } } } } } }
    });
    
    // Adapt to frontend expected structure
    const mapped = orders.map(o => ({
      id: o.id,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      items: o.items.map(i => ({
        id: i.id,
        product: {
          title: i.variant.product.title,
          imageUrl: i.variant.product.images[0]?.url || ''
        },
        quantity: i.quantity,
        priceAtPurchase: i.priceAtPurchase
      }))
    }));
    
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id as string },
      include: { items: { include: { variant: { include: { product: { include: { images: true } } } } } } }
    });
    
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const userId = req.headers['x-user-id'] as string;
    const role = req.headers['x-user-role'] as string;

    // IDOR Protection: If order belongs to a user, ONLY that user or ADMIN can access it.
    if (order.userId) {
      if (order.userId !== userId && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    
    res.json({
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      items: order.items.map(i => ({
        id: i.id,
        product: {
          title: i.variant.product.title,
          imageUrl: i.variant.product.images[0]?.url || ''
        },
        quantity: i.quantity,
        priceAtPurchase: i.priceAtPurchase
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Mock webhook endpoint to verify payment and mark order as PAID
router.post('/:id/pay', actionLimiter, async (req, res) => {
  try {
    const { signature } = req.body;
    
    // In production, signature would come from Razorpay webhook headers
    const isValid = await paymentProvider.verifyPayment({}, signature || 'mock_valid_signature');
    
    if (!isValid) {
      res.status(400).json({ error: 'Invalid payment signature' });
      return;
    }

    // Idempotency: verify order isn't already paid
    const currentOrder = await prisma.order.findUnique({
      where: { id: req.params.id as string },
      include: { items: true, payments: true }
    }) as any;
    
    if (!currentOrder || currentOrder.status === OrderStatus.PAID) {
      res.json(currentOrder); // Return idempotently
      return;
    }

    // Mark as PAID and finalize inventory in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Release reserved inventory and decrement stockCount permanently
      for (const item of currentOrder.items) {
        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: { 
            stockCount: { decrement: item.quantity },
            reserved: { decrement: item.quantity }
          }
        });
      }
      
      await tx.payment.updateMany({
        where: { orderId: currentOrder.id },
        data: { status: 'SUCCESS' }
      });
      
      return await tx.order.update({
        where: { id: currentOrder.id },
        data: { status: OrderStatus.PAID }
      });
    });
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to pay order' });
  }
});

router.post('/:id/cancel', actionLimiter, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id as string },
      include: { items: true }
    }) as any;

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const userId = req.headers['x-user-id'] as string;
    const role = req.headers['x-user-role'] as string;

    if (order.userId && order.userId !== userId && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (order.status === OrderStatus.CANCELLED) {
      return res.json(order); // Idempotent
    }

    if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
      return res.status(400).json({ error: 'Cannot cancel shipped or delivered orders' });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // If the order was PAID, we should just mark it CANCELLED, but also we need to replenish stock if it was paid?
      // Wait, if it was PAID, stockCount was decremented. If it was PENDING, stockCount wasn't decremented but reserved was.
      // So we must handle both cases.
      for (const item of order.items) {
        if (order.status === OrderStatus.PAID) {
          // It was paid and finalized. We must add back to stockCount.
          await tx.inventory.update({
            where: { variantId: item.variantId },
            data: { stockCount: { increment: item.quantity } }
          });
        } else {
          // It was PENDING. We must release reserved stock.
          await tx.inventory.update({
            where: { variantId: item.variantId },
            data: { reserved: { decrement: item.quantity } }
          });
        }
      }

      await tx.payment.updateMany({
        where: { orderId: order.id },
        data: { status: 'REFUNDED' }
      });

      return await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED }
      });
    });

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

export default router;
