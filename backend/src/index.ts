import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

import { prisma } from './db';

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  
  // Realistic Auto-progress order statuses based on creation time
  setInterval(async () => {
    try {
      const now = new Date();
      
      // PAID -> SHIPPED (takes 1 min from order creation)
      const oneMinAgo = new Date(now.getTime() - 1 * 60 * 1000);
      await prisma.order.updateMany({
        where: { 
          status: 'PAID',
          createdAt: { lt: oneMinAgo }
        },
        data: { status: 'SHIPPED' }
      });

      // SHIPPED -> DELIVERED (takes 5 mins from order creation)
      const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);
      await prisma.order.updateMany({
        where: { 
          status: 'SHIPPED',
          createdAt: { lt: fiveMinsAgo } 
        },
        data: { status: 'DELIVERED' }
      });
    } catch (e) {
      console.error('Auto-progress error:', e);
    }
  }, 10000); // Check every 10 seconds
});
