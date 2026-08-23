# Migrations

This project previously used `prisma db push` and had no migration history, so
the first migration here is a **baseline** describing the schema as it already
existed. How you apply these depends on whether your database already has data.

## An existing database (staging, production)

The baseline must be marked as already applied, or `migrate deploy` will try to
create tables that are already there and fail:

```bash
cd backend
npx prisma migrate resolve --applied 00000000000000_baseline_existing_schema
npx prisma migrate deploy
```

The second command applies
`20260823120000_payment_methods_refunds_and_variant_options`, which is
data-safe: it drops no column, changes no column type and removes no table.

It does delete two categories of rows that the new constraints cannot accept,
so check them first if you use coupons:

```sql
-- Duplicate redemptions (all but the earliest per coupon+customer are removed)
SELECT "couponId", "userId", count(*) FROM "CouponUsage"
GROUP BY 1,2 HAVING count(*) > 1;

-- Redemptions pointing at users that no longer exist (removed)
SELECT * FROM "CouponUsage" WHERE "userId" NOT IN (SELECT id FROM "User");
```

It also remaps any `Order.status = 'PROCESSING'` to `PENDING`. That value only
existed in `frontend/prisma/schema.prisma`, which had drifted from the backend's;
the two schemas are now identical.

## A fresh database

```bash
cd backend
npx prisma migrate deploy
npm run seed
```

## Making further schema changes

Use `npx prisma migrate dev --name <description>` from `backend/`, and commit
the generated folder. Do not run `prisma db push` against a database that has
data, and never run it from `frontend/` — that directory's schema is a copy kept
only for the NextAuth adapter's client.
