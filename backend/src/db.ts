// Ensures .env is loaded before the Prisma client reads DATABASE_URL.
import './config/env';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * A single Prisma client per process. Re-used across `tsx watch` reloads so a
 * dev session doesn't exhaust the database connection pool.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
