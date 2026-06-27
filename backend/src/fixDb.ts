import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  await prisma.$executeRawUnsafe(`UPDATE "Order" SET status = 'PENDING' WHERE status::text = 'PROCESSING'`);
  console.log("Fixed!");
}
fix().catch(console.error).finally(() => prisma.$disconnect());
