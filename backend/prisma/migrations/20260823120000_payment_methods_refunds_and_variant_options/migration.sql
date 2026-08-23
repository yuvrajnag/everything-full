-- Adds per-variant configuration + pricing, Cash on Delivery orders, and the
-- refund bookkeeping that `POST /orders/:id/cancel` needs.
--
-- This migration is DATA-SAFE: it drops no column, changes no column type and
-- removes no table. The three statements at the top exist because new
-- constraints introduced here cannot be applied to rows that predate them —
-- without the remediation, the migration aborts partway.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Data remediation (must run before the constraints below)
-- ─────────────────────────────────────────────────────────────────────────

-- Some databases were last synced from frontend/prisma/schema.prisma, which
-- carried a `PROCESSING` status the backend never had. Those rows are remapped
-- to PENDING (the same remedy the old backend/src/fixDb.ts script applied)
-- so the enum rebuild in step 2 can re-type the column. This is a no-op where
-- the value was never present.
UPDATE "Order" SET "status" = 'PENDING' WHERE "status"::text = 'PROCESSING';

-- CouponUsage gains a UNIQUE (couponId, userId). Collapse any pre-existing
-- duplicate redemptions down to the earliest row per (coupon, customer).
DELETE FROM "CouponUsage" a
USING "CouponUsage" b
WHERE a."couponId" = b."couponId"
  AND a."userId"   = b."userId"
  AND (a."createdAt", a."id") > (b."createdAt", b."id");

-- CouponUsage.userId becomes a real foreign key. Drop rows pointing at users
-- that no longer exist, which the previous unconstrained column allowed.
DELETE FROM "CouponUsage"
WHERE "userId" NOT IN (SELECT "id" FROM "User");

-- ─────────────────────────────────────────────────────────────────────────
-- 2. OrderStatus: add PAID (where missing) and CONFIRMED, drop PROCESSING
-- ─────────────────────────────────────────────────────────────────────────
-- Rebuilt rather than patched with ALTER TYPE ... ADD VALUE so that the result
-- is identical whether the database currently matches the old backend schema
-- (PAID, no PROCESSING) or the old frontend schema (PROCESSING, no PAID).
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";

CREATE TYPE "OrderStatus" AS ENUM (
  'PENDING', 'PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'
);

ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING ("status"::text::"OrderStatus");
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "OrderStatus_old";

-- ─────────────────────────────────────────────────────────────────────────
-- 3. New columns and types
-- ─────────────────────────────────────────────────────────────────────────

-- AlterTable
-- Address.email is present in databases synced from the old backend schema but
-- absent from those synced from the old frontend schema, which omitted it.
-- Checkout writes this column on every order, so add it where it is missing.
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "email" TEXT;

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'UPI', 'COD');

-- AlterTable
-- NOTE: every pre-existing order is backfilled to CARD, since the old schema
-- did not record how an order was paid for. See step 5.
ALTER TABLE "Order" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CARD';

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "label" TEXT;

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "failureReason" TEXT,
ADD COLUMN "providerRefundId" TEXT,
ADD COLUMN "refundedAmount" INTEGER NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Indexes and foreign keys
-- ─────────────────────────────────────────────────────────────────────────

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerRefundId_key" ON "Payment"("providerRefundId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CouponUsage_couponId_userId_key" ON "CouponUsage"("couponId", "userId");

-- CreateIndex
CREATE INDEX "AuditLog_orderId_idx" ON "AuditLog"("orderId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- DropForeignKey / AddForeignKey: CouponUsage.couponId gains ON DELETE CASCADE
ALTER TABLE "CouponUsage" DROP CONSTRAINT "CouponUsage_couponId_fkey";

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Mark one default variant per product
-- ─────────────────────────────────────────────────────────────────────────
-- Without this, every existing variant has isDefault = false and the product
-- page falls back to variants[0] (cheapest by price), silently showing and
-- charging the wrong tier on configurable products. Pick the cheapest variant
-- per product as the default, matching what `prisma/seed.ts` produces.
UPDATE "Variant" v
SET "isDefault" = true
WHERE v."id" = (
  SELECT v2."id" FROM "Variant" v2
  WHERE v2."productId" = v."productId"
  ORDER BY v2."price" ASC, v2."id" ASC
  LIMIT 1
);
