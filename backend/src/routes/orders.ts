import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { OrderStatus } from '@prisma/client';
import { MockPaymentProvider } from '../services/payment/MockPaymentProvider';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../lib/redis';
import { requireInternalSecret } from '../middleware/auth';
import * as crypto from 'crypto';

const router = Router();
const paymentProvider = new MockPaymentProvider();

// ─── Rate limiters ─────────────────────────────────────────────────────
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)) as any,
  }),
  message: { error: 'Too many orders created, please try again later.' },
});

const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0]!, ...args.slice(1)) as any,
  }),
  message: { error: 'Too many requests, please try again later.' },
});

// ─── All order routes require the internal secret ──────────────────────
router.use(requireInternalSecret);

// ─── Zod schemas ───────────────────────────────────────────────────────
const shippingAddressSchema = z.object({
  email: z.string().email().max(255),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pinCode: z.string().regex(/^\d{6}$/),
  phone: z.string().regex(/^\d{10}$/),
  country: z.string().min(1).max(100),
});

const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1).max(100),
    quantity: z.number().int().positive().max(10),
  })).min(1).max(20),
  paymentMethod: z.enum(['card', 'upi', 'cod']),
  shippingAddress: shippingAddressSchema,
  // Client-sent values we explicitly ignore for pricing (defense in depth)
  totalAmount: z.any().optional(),
  priceAtPurchase: z.any().optional(),
}).strict();



// ─── POST /  — Create order ───────────────────────────────────────────
router.post('/', checkoutLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      return;
    }
    const { items, paymentMethod, shippingAddress } = parsed.data;
    const userId = req.headers['x-user-id'] as string | undefined;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: Login required to place orders' });
      return;
    }

    // ─── Idempotency check ───────────────────────────────────────────
    const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
    if (idempotencyKey) {
      const existingOrderId = await redis.get(`idempotency:${idempotencyKey}`);
      if (existingOrderId) {
        // Return the existing order
        const existingOrder = await prisma.order.findUnique({
          where: { id: existingOrderId },
          include: { items: true, address: true },
        });
        if (existingOrder) {
          res.json(existingOrder);
          return;
        }
      }
    }

    // ─── Server-side price calculation ───────────────────────────────
    let calculatedTotal = 0;
    const orderItemsData: { variantId: string; quantity: number; priceAtPurchase: number }[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: { include: { inventory: true } } },
      });

      if (!product || product.variants.length === 0) {
        res.status(400).json({ error: `Product ${item.productId} not found or missing variants` });
        return;
      }

      const defaultVariant = product.variants[0];
      if (!defaultVariant) {
        res.status(400).json({ error: 'Product variant not found' });
        return;
      }

      const itemPrice = defaultVariant.price;
      calculatedTotal += itemPrice * item.quantity;

      orderItemsData.push({
        variantId: defaultVariant.id,
        quantity: item.quantity,
        priceAtPurchase: itemPrice,
      });
    }

    // ─── Atomic transaction: reserve inventory + create order ─────────
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
          throw new Error(`Not enough stock for variant ${item.variantId}`);
        }
      }

      // Create Address
      const address = await tx.address.create({
        data: {
          userId: userId,
          email: shippingAddress.email,
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          addressLine: shippingAddress.address,
          city: shippingAddress.city,
          state: shippingAddress.state,
          pinCode: shippingAddress.pinCode,
          country: shippingAddress.country,
          phone: shippingAddress.phone,
        },
      });

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          totalAmount: calculatedTotal,
          status: 'PENDING',
          userId: userId,
          addressId: address.id,
          items: { create: orderItemsData },
        },
        include: { items: true, address: true },
      });

      return newOrder;
    });

    // ─── Store idempotency key ───────────────────────────────────────
    if (idempotencyKey) {
      // 24 hour TTL
      await redis.setex(`idempotency:${idempotencyKey}`, 24 * 60 * 60, order.id);
    }

    // ─── Initialize Payment ──────────────────────────────────────────
    const payment = await paymentProvider.createOrder(calculatedTotal, 'INR', order.id);

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'MOCK',
        providerOrderId: payment.id,
        amount: calculatedTotal,
        status: 'PENDING',
      },
    });

    // Auto-confirm for COD/Card
    if (paymentMethod === 'cod' || paymentMethod === 'card') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID },
      });
    }

    res.status(201).json(order);
  } catch (error: any) {
    console.error(`[ERROR] Order creation: ${error.message}`);
    res.status(400).json({ error: 'Failed to create order', details: error.message });
  }
});

// ─── GET /  — List orders ─────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const role = req.headers['x-user-role'] as string;

    if (!userId && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const where = (role === 'ADMIN' || role === 'SUPER_ADMIN') ? {} : { userId };

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { variant: { include: { product: { include: { images: true } } } } } },
        address: true,
        user: true,
      },
    });

    const mapped = orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      items: o.items.map((i) => ({
        id: i.id,
        product: {
          title: i.variant.product.title,
          imageUrl: i.variant.product.images[0]?.url || '',
        },
        quantity: i.quantity,
        priceAtPurchase: i.priceAtPurchase,
      })),
      shippingAddress: {
        ...o.address,
        email: o.address?.email || o.user?.email || null,
      },
    }));

    res.json(mapped);
  } catch (error) {
    console.error('[ERROR] Fetch orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ─── GET /:id  — Get single order ─────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id as string;
    if (!orderId || orderId.length > 50) {
      res.status(400).json({ error: 'Invalid order ID' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { variant: { include: { product: { include: { images: true } } } } } },
        address: true,
        user: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // IDOR Protection
    const userId = req.headers['x-user-id'] as string;
    const role = req.headers['x-user-role'] as string;
    if (order.userId && order.userId !== userId && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        id: i.id,
        product: {
          title: i.variant.product.title,
          imageUrl: i.variant.product.images[0]?.url || '',
        },
        quantity: i.quantity,
        priceAtPurchase: i.priceAtPurchase,
      })),
      shippingAddress: {
        ...order.address,
        email: order.address?.email || order.user?.email || null,
      },
    });
  } catch (error) {
    console.error('[ERROR] Fetch order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ─── POST /:id/pay  — Verify payment ─────────────────────────────────
router.post('/:id/pay', actionLimiter, async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id as string;
    if (!orderId || orderId.length > 50) {
      res.status(400).json({ error: 'Invalid order ID' });
      return;
    }

    const { signature } = req.body;
    const isValid = await paymentProvider.verifyPayment({}, signature || 'mock_valid_signature');

    if (!isValid) {
      res.status(400).json({ error: 'Invalid payment signature' });
      return;
    }

    // Idempotency: verify order isn't already paid
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true },
    }) as any;

    if (!currentOrder) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (currentOrder.status === OrderStatus.PAID) {
      res.json(currentOrder); // Idempotent return
      return;
    }

    // Atomic: finalize inventory + mark PAID
    const order = await prisma.$transaction(async (tx) => {
      for (const item of currentOrder.items) {
        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: {
            stockCount: { decrement: item.quantity },
            reserved: { decrement: item.quantity },
          },
        });
      }

      await tx.payment.updateMany({
        where: { orderId: currentOrder.id },
        data: { status: 'SUCCESS' },
      });

      return await tx.order.update({
        where: { id: currentOrder.id },
        data: { status: OrderStatus.PAID },
      });
    });

    res.json(order);
  } catch (error) {
    console.error('[ERROR] Payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// ─── POST /:id/cancel  — Cancel order ────────────────────────────────
router.post('/:id/cancel', actionLimiter, async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id as string;
    if (!orderId || orderId.length > 50) {
      res.status(400).json({ error: 'Invalid order ID' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    }) as any;

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // IDOR Protection
    const userId = req.headers['x-user-id'] as string;
    const role = req.headers['x-user-role'] as string;
    if (order.userId && order.userId !== userId && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Idempotent
    if (order.status === OrderStatus.CANCELLED) {
      res.json(order);
      return;
    }

    if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
      res.status(400).json({ error: 'Cannot cancel shipped or delivered orders' });
      return;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (order.status === OrderStatus.PAID) {
          // Paid: add back to stockCount
          await tx.inventory.update({
            where: { variantId: item.variantId },
            data: { stockCount: { increment: item.quantity } },
          });
        } else {
          // Pending: release reserved stock
          await tx.inventory.update({
            where: { variantId: item.variantId },
            data: { reserved: { decrement: item.quantity } },
          });
        }
      }

      await tx.payment.updateMany({
        where: { orderId: order.id },
        data: { status: 'REFUNDED' },
      });

      return await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error('[ERROR] Cancel order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

export default router;
