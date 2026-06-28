# 🛍️ EVERYTHING Store

![Everything Store Banner](https://raw.githubusercontent.com/yuvrajnag/everything-full/main/frontend/public/stuff/e.png)

An industrial-standard, highly scalable e-commerce application engineered by **Silver Cloud Labs**. This project demonstrates a production-ready architecture featuring atomic inventory transactions, internal proxy security, and a beautiful, modern UI/UX.

---

## 🏗️ System Design & Architecture

The `everything` project splits the stack into a decoupled frontend and backend. To ensure maximum security, the backend is **not directly exposed** to the public internet for client requests. Instead, the Next.js frontend acts as a **secure proxy gateway**.

### 🔐 Internal Proxy Security Pattern
1. The user interacts with the Next.js frontend (hosted on Vercel).
2. API calls (like `/api/proxy/orders`) hit the Next.js server first.
3. The Next.js server validates the session and injects a cryptographic `INTERNAL_API_KEY` into the headers.
4. The Next.js server proxies the request to the Express backend (hosted on Railway).
5. The backend verifies the `INTERNAL_API_KEY` and rejects any request missing it, preventing malicious actors from bypassing the frontend.

### 🛡️ ACID Transactions & Concurrency
To prevent "race conditions" where two users buy the last item at the exact same millisecond, the backend uses **Prisma `$transactions`**. When an order is placed, the database atomically checks stock, reserves the quantity, and creates the order in a single, locked transaction.

### ⚡ Distributed Rate Limiting
The backend is protected by Redis-backed rate limiters (via Upstash). If an attacker attempts to spam payment endpoints or login routes, Redis tracks their IP across all server instances and blocks them.

---

## 💻 Tech Stack

### Frontend (UI & Client)
* **Framework:** [Next.js 15](https://nextjs.org/) (React 19) using the App Router
* **Styling:** Tailwind CSS (Custom glassmorphism & micro-animations)
* **State Management:** Zustand (Lightning-fast client-side persistence)
* **Authentication:** NextAuth.js (Auth.js) with Google OAuth 2.0
* **Icons:** Lucide React
* **Deployment:** Vercel

### Backend (API & Business Logic)
* **Framework:** Node.js with Express.js (100% TypeScript)
* **Validation:** Zod (Strict runtime schema validation)
* **ORM:** Prisma
* **Deployment:** Railway

### Database & Infrastructure
* **Primary Database:** PostgreSQL (Hosted on Supabase)
* **Connection Pooling:** PgBouncer
* **Caching & Rate Limiting:** Redis (Hosted on Upstash)

---

## 📂 Directory Structure

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
│   │   ├── routes/           # Express API endpoints
│   │   ├── controllers/      # Business logic and request handlers
│   │   └── services/         # Third-party integrations (Payment mock, etc.)
│   ├── prisma/               # Database schema and migrations
│   └── .env                  # Backend Environment Variables
│
└── README.md
```

---

## 🚀 How to Run Locally

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18+)
- PostgreSQL Database URL
- Redis Database URL (Upstash recommended)
- Google OAuth Client ID & Secret

### 1. Backend Setup
```bash
cd backend
npm install

# Set up your .env file
cp .env.example .env
# Fill in DATABASE_URL, DIRECT_URL, REDIS_URL, and INTERNAL_API_KEY

# Generate Prisma Client & push schema to database
npx prisma generate
npx prisma db push

# Start the development server
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install

# Set up your .env file
cp .env.example .env
# Fill in NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# Ensure INTERNAL_API_KEY matches the backend
# Set NEXT_PUBLIC_API_URL to your local backend (http://localhost:5000/api)

# Start the Next.js development server
npm run dev
```

The application will now be running at `http://localhost:3000`.

---

## ⚠️ Project Disclosure
This application is a proprietary demonstration platform engineered by Silver Cloud Labs (a division of Beyond Studios). It is specifically designed as a controlled environment for testing advanced Artificial Intelligence models, automated agent workflows, and next-generation UI/UX interactions. All products, prices, and payments are strictly mocked for demonstration purposes.
