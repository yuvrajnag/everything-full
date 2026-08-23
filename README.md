# EVERYTHING

![Everything Store Banner](https://raw.githubusercontent.com/yuvrajnag/everything-full/main/frontend/public/stuff/e.png)

An industrial-standard, highly scalable e-commerce architecture engineered by **Silver Cloud Labs**. This project demonstrates a production-ready ecosystem featuring atomic inventory transactions, internal proxy security, and a minimalist, state-of-the-art UI/UX.

---

## SYSTEM DESIGN & ARCHITECTURE

The `everything` project enforces strict decoupling between the client and server. To ensure maximum security, the backend is **not directly exposed** to the public internet for client requests. Instead, the Next.js frontend acts as a secure proxy gateway.

### Internal Proxy Security Pattern
1. The user interacts with the Next.js frontend (hosted on Vercel).
2. API calls (e.g., `/api/proxy/orders`) are routed to the Next.js edge first.
3. The Next.js server validates the session and injects a cryptographic `INTERNAL_API_KEY` into the request headers.
4. The Next.js server proxies the request to the Express backend (hosted on Railway).
5. The backend verifies the `INTERNAL_API_KEY` and rejects any request missing it, neutralizing direct external API spoofing.

### ACID Transactions & Concurrency
To eliminate race conditions (e.g., concurrent purchases of a single remaining item), the backend utilizes **Prisma `$transactions`**. When an order is placed, the database atomically checks stock, reserves the quantity, and creates the order within a single, isolated transaction block.

### Distributed Rate Limiting
The backend infrastructure is protected by distributed rate limiters backed by Redis (via Upstash). Malicious attempts to brute-force payment endpoints or authentication routes are tracked across all server instances and blocked at the network level.

---

## TECHNOLOGY STACK

### Frontend (Client Layer)
* **Framework:** [Next.js 15](https://nextjs.org/) (React 19) via App Router
* **Styling:** Tailwind CSS (Engineered for glassmorphism and micro-animations)
* **State Management:** Zustand (High-performance client-side persistence)
* **Authentication:** NextAuth.js (Auth.js) with Google OAuth 2.0
* **Deployment:** Vercel Edge Network

### Backend (API Layer)
* **Framework:** Node.js with Express.js (100% TypeScript)
* **Validation:** Zod (Strict runtime schema parsing)
* **ORM:** Prisma
* **Deployment:** Railway

### Database & Infrastructure
* **Primary Database:** PostgreSQL (Hosted on Supabase)
* **Connection Pooling:** PgBouncer
* **Caching & Limits:** Redis (Hosted on Upstash)

---

## DIRECTORY STRUCTURE

```text
everything-full/
├── frontend/                 # Next.js Application
│   ├── src/
│   │   ├── app/              # Next.js App Router (Pages & Layouts)
│   │   ├── components/       # Reusable React components (UI, Layout, Product)
│   │   ├── store/            # Zustand global state (Cart, User Profile)
│   │   └── data/             # Static mock data / fallback catalogs
│   ├── public/               # Static assets, SVGs, and product images
│   └── .env                  # Frontend Environment Variables
│
├── backend/                  # Node.js/Express Application
│   ├── src/
│   │   ├── config/           # Environment loading and validation
│   │   ├── routes/           # Express API endpoints
│   │   ├── middleware/       # Internal-secret and identity checks
│   │   ├── serializers/      # Shared API response shapes
│   │   └── services/         # Third-party integrations (Razorpay)
│   ├── prisma/               # Database schema and seed
│   └── .env                  # Backend Environment Variables
│
└── README.md
```

---

## LOCAL DEVELOPMENT

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18+)
- PostgreSQL Database URL
- Redis Database URL (Upstash recommended)
- Google OAuth Client ID & Secret

### 1. Backend Initialization
```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Required: DATABASE_URL, DIRECT_URL, INTERNAL_API_KEY
# For card/UPI payments: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (test-mode keys)
# Optional: REDIS_URL, ALLOWED_ORIGINS

# Generate Prisma Client & sync schema
npx prisma generate
npx prisma db push

# Load the catalogue
npm run seed

# Boot server
npm run dev
```

Leaving the Razorpay keys empty is supported: the store runs Cash on Delivery only, and card/UPI checkout is rejected with a clear message instead of failing silently.

### 2. Frontend Initialization
```bash
cd frontend
npm install

# Configure environment
cp .env.example .env.local
# Required: NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# Ensure INTERNAL_API_KEY matches the backend configuration
# Set NEXT_PUBLIC_API_URL to http://localhost:5000/api
# Set NEXT_PUBLIC_RAZORPAY_KEY_ID to the same key id as the backend

# Boot client
npm run dev
```

> The Prisma schema in `frontend/prisma` is a copy of the backend's, needed only
> by the NextAuth adapter. Run migrations from `backend/` — never `prisma db push`
> from the frontend, or the two will drift.

The application will initialize at `http://localhost:3000`.

---

## MONEY UNITS

Every amount is stored and transmitted in **paise**. Order API fields carry a
`Paise` suffix (`totalPaise`, `unitPricePaise`) precisely so a UI cannot render
one as rupees by accident. Use `frontend/src/lib/format.ts` for display.

---

## FULFILMENT

Order statuses advance to `SHIPPED` and `DELIVERED` only when something actually
dispatches. The timer-based progression that used to do this automatically is
now behind `SIMULATE_LOGISTICS`, which is for local development and which the
server refuses to start with in production.

Before going live you need a way for an operator to mark orders dispatched —
either an admin endpoint or a direct database process. Until then, paid orders
stay at `PAID`/`CONFIRMED`, which is honest but means customers never see a
dispatch update.

---

## PROJECT DISCLOSURE
This storefront is operated by Silver Cloud Labs (a division of Beyond Studios).
Payments run through Razorpay. Pointed at test-mode keys no real money moves;
pointed at live keys, customers are charged for real.
