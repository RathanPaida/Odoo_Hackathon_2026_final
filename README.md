<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma" />
  <img src="https://img.shields.io/badge/Razorpay-Integrated-0C2451?style=for-the-badge" />
</p>

# DealFlow360

> **Enterprise B2B Quote-to-Cash Platform** — Built at the Odoo Hackathon 2026

DealFlow360 is a full-stack enterprise quoting, approval, fulfillment, and billing platform. It manages the complete lifecycle of a B2B deal — from creating a quote with configurable discounts, routing it through role-based approval chains, allocating warehouse stock with concurrency-safe locking, generating invoices, handling recurring subscriptions with proration, and enabling customer self-service through a shareable portal.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Seeding & Demo Accounts](#database-seeding--demo-accounts)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Role-Based Dashboards](#role-based-dashboards)
- [API Endpoints](#api-endpoints)
- [Business Logic](#business-logic)
- [Payment Integration](#payment-integration)
- [Team](#team)

---

## Features

### Core Deal Pipeline
- **Quote Builder** — Create multi-line quotes with mixed one-time and recurring products, live pricing preview, blended discount calculation, and margin analysis
- **Discount Governance** — Tier-aware discount rules per product category. Quotes below thresholds auto-approve; above thresholds route to the appropriate role
- **Multi-Cycle Approval** — Approval queue for Sales Managers with approve/reject workflow, audit trail per cycle, and re-approval on negotiation
- **Warehouse Allocation** — Concurrency-safe stock reservation using `SELECT ... FOR UPDATE` with serializable isolation. Greedy multi-warehouse split with automatic backorder creation
- **Invoice Generation** — Certified tax invoices with line items, issued on quote confirmation
- **Subscription Billing** — Recurring plans with proration for mid-month starts, auto-pay toggle, and cancel/reactivate controls

### Customer Experience
- **Customer Portal** — Shareable token-based portal for customers to view quotes and submit counter-offers without logging in
- **Customer Dashboard** — Self-service billing page with subscription management, invoice history, and Razorpay payment checkout
- **Support System** — Customer support inquiry form with tracking

### Platform
- **Role-Based Access Control** — Five roles (Sales Rep, Sales Manager, Finance, Admin, Customer) with granular permission mapping and route-level enforcement
- **Self-Built Auth** — Argon2id password hashing, JWT access tokens (15 min), rotating refresh tokens (30 day), httpOnly cookies
- **Email Verification** — OTP-based email verification via Gmail SMTP
- **Anomaly Detection** — Deterministic rules for deep discounts, negative margins, and excessive re-approvals
- **Append-Only Audit Log** — Every state transition recorded with before/after JSON snapshots
- **Redis Caching** — Cache-aside pattern for product catalog, price lists, and upsell rules (300s TTL)
- **Rate Limiting** — Token bucket on portal endpoints (30 req/min per IP, 100 req/hr per token)
- **Background Jobs** — BullMQ worker process for anomaly scanning on state changes

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│  Next.js App Router  ·  React 19  ·  TanStack Query  ·  Recharts│
└───────────────────────────────┬──────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Next.js 16 Server   │
                    │   (API Route Handlers) │
                    │   + Server Components  │
                    │   + Edge Middleware     │
                    └───┬───────┬───────┬───┘
                        │       │       │
              ┌─────────▼──┐ ┌──▼────┐ ┌▼──────────┐
              │ PostgreSQL │ │ Redis │ │ Razorpay  │
              │    16      │ │   7   │ │  Gateway  │
              └────────────┘ └───────┘ └───────────┘
                        │
                  ┌─────▼──────┐
                  │  BullMQ    │
                  │  Worker    │
                  │ (separate) │
                  └────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, TypeScript strict) |
| **Runtime** | Node.js 22 LTS |
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma 6 with `$transaction` + `$queryRaw` |
| **Cache & Queue** | Redis 7 via `ioredis`, BullMQ |
| **Auth** | Argon2id (`@node-rs/argon2`) + JWT (`jose`) + httpOnly cookies |
| **Validation** | Zod (shared client/server schemas) |
| **UI** | Tailwind CSS 4 + custom component library |
| **Client State** | TanStack Query |
| **Charts** | Recharts |
| **Payments** | Razorpay Standard Checkout + embedded fallback |
| **Email** | Nodemailer (Gmail SMTP) |

---

## Getting Started

### Prerequisites

```bash
node --version    # 20.x or 22.x LTS
npm --version     # 10+
```

You need a running PostgreSQL 16 instance. Options:
- **Local install** (recommended for hackathon)
- **Docker**: `docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`
- **Neon / Supabase** (hosted)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/RathanPaida/Odoo_Hackathon_2026_final.git
cd Odoo_Hackathon_2026_final

# 2. Install dependencies
npm install

# 3. Copy environment file and configure
cp .env.example .env.local
cp .env.example .env
# Edit .env.local and .env with your database URL and secrets

# 4. Generate Prisma client
npx prisma generate

# 5. Run database migrations
npx prisma migrate dev --name init

# 6. Seed demo data
npx prisma db seed
```

---

## Environment Variables

Copy `.env.example` to both `.env` (for Prisma CLI) and `.env.local` (for Next.js runtime).

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | Optional | Redis connection (defaults to `redis://localhost:6379`) |
| `JWT_ACCESS_SECRET` | ✅ | 32+ char secret for access tokens |
| `JWT_REFRESH_SECRET` | ✅ | 32+ char secret for refresh tokens |
| `SMTP_HOST` | Optional | SMTP server for email verification |
| `SMTP_USER` | Optional | SMTP username |
| `SMTP_PASS` | Optional | SMTP password (App Password for Gmail) |
| `RAZORPAY_KEY_ID` | Optional | Razorpay key ID (leave blank for demo checkout) |
| `RAZORPAY_KEY_SECRET` | Optional | Razorpay key secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Optional | Razorpay key ID (browser-safe) |

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Seeding & Demo Accounts

Run `npx prisma db seed` to populate the database with:

- **5 users** (one per role, password: `password123`)
- **5 customers** spanning Bronze, Silver, Gold tiers
- **20 products** across Hardware, Software, Services, Support, and Networking categories (mix of one-time and recurring)
- **1 default price list** covering all products
- **20 discount rules** for every tier × category combination
- **3 warehouses** with deliberately uneven stock (including concurrency demo scenarios)
- **6 upsell rules**
- **1 pre-seeded quote** in `PENDING_APPROVAL` state

### Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| **Sales Rep** | `rep@dealflow.local` | `password123` |
| **Sales Manager** | `manager@dealflow.local` | `password123` |
| **Finance** | `finance@dealflow.local` | `password123` |
| **Admin** | `admin@dealflow.local` | `password123` |
| **Customer** | `customer@dealflow.local` | `password123` |

To reset to a clean state:
```bash
npm run db:reset
```

---

## Running the Application

```bash
# Start the Next.js dev server
npm run dev
# → http://localhost:3000

# (Optional) Start the BullMQ background worker in a separate terminal
npm run worker

# (Optional) Open Prisma Studio to inspect data
npx prisma studio
```

---

## Project Structure

```
├── prisma/
│   ├── live.prisma            # Active Prisma schema (source of truth)
│   ├── schema.prisma          # Extended schema reference
│   ├── seed.ts                # Deterministic seed data
│   └── migrations/            # Database migrations
├── worker/
│   └── index.ts               # BullMQ worker (anomaly detection, notifications)
├── src/
│   ├── middleware.ts           # Edge middleware — JWT route gating
│   ├── app/
│   │   ├── (auth)/             # Login, Signup, Forgot/Reset Password, Email Verify
│   │   ├── dashboard/
│   │   │   ├── rep/            # Sales Rep: quotes, customers
│   │   │   ├── manager/        # Sales Manager: approval queue, pipeline metrics
│   │   │   ├── finance/        # Finance: fulfillment, invoices, allocations
│   │   │   ├── admin/          # Admin: user management, product catalog
│   │   │   ├── customer/       # Customer: billing, subscriptions, support
│   │   │   ├── reports/        # Analytics and reporting
│   │   │   └── settings/       # User settings and profile
│   │   ├── portal/[token]/     # Public customer portal (no login required)
│   │   ├── catalog/            # Product catalog browser
│   │   ├── approvals/          # Approval workflow views
│   │   ├── fulfillment/        # Warehouse allocation views
│   │   └── api/                # API route handlers (see below)
│   ├── lib/
│   │   ├── db.ts               # Prisma singleton
│   │   ├── redis.ts            # ioredis singleton
│   │   ├── audit.ts            # Append-only audit log writer
│   │   ├── cache.ts            # Cache-aside helpers (300s TTL)
│   │   ├── ratelimit.ts        # Token bucket rate limiter
│   │   ├── auth/
│   │   │   ├── password.ts     # Argon2id hashing
│   │   │   ├── jwt.ts          # JWT sign/verify via jose
│   │   │   ├── session.ts      # Cookie-based session management
│   │   │   └── rbac.ts         # Role → permission mapping and guards
│   │   ├── contracts/          # Zod schemas (shared client/server)
│   │   └── services/           # Business logic modules
│   │       ├── pricing.ts      # Line total, blended discount, margin calculation
│   │       ├── discount.ts     # Tier-aware discount governance rules
│   │       ├── approval-flow.service.ts  # Approval routing engine
│   │       ├── fulfillment.service.ts    # Concurrency-safe warehouse allocation
│   │       ├── billing.ts      # Invoice generation
│   │       ├── subscription.ts # Subscription lifecycle and proration
│   │       ├── catalog.service.ts # Product catalog with cache
│   │       ├── portal.ts       # Customer portal token management
│   │       ├── dashboard.ts    # Dashboard aggregate metrics
│   │       └── reports.ts      # Reporting and analytics
│   └── components/
│       ├── ui/                 # Shared component library (Button, Card, Modal, Toast, Badge)
│       ├── navbar/             # Role-aware navigation sidebar
│       ├── invoices/           # Invoice detail modal
│       └── payments/           # Razorpay payment modal
└── package.json
```

---

## Role-Based Dashboards

Each role sees a tailored dashboard with role-gated navigation:

| Role | Dashboard | Key Features |
|---|---|---|
| **Sales Rep** | `/dashboard/rep` | Create quotes, manage customers, add lines with live pricing, submit for approval |
| **Sales Manager** | `/dashboard/manager` | Approval queue, approve/reject with reason, pipeline metrics, anomaly alerts |
| **Finance** | `/dashboard/finance` | Warehouse allocation, invoice management, fulfillment tracking, stock overview |
| **Admin** | `/dashboard/admin` | User management (CRUD), product catalog administration, system-wide audit logs |
| **Customer** | `/dashboard/customer` | Subscription management, billing & invoices, Razorpay payments, support tickets |

---

## API Endpoints

### Authentication
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Create user account |
| `POST` | `/api/auth/login` | Public | Login, set httpOnly cookies |
| `POST` | `/api/auth/refresh` | Cookie | Rotate access token |
| `POST` | `/api/auth/logout` | Cookie | Revoke refresh token |
| `GET` | `/api/auth/me` | Any | Get current user profile |

### Quotes & Pricing
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET/POST` | `/api/quotes` | Rep+ | List / create draft quotes |
| `GET` | `/api/quotes/:id` | Owner/Mgr | Full quote with lines, allocations, approvals |
| `POST` | `/api/quotes/:id/lines` | Rep | Add line, recompute totals |
| `POST` | `/api/quotes/:id/submit` | Rep | Submit for approval routing |
| `POST` | `/api/quotes/:id/approve` | Manager | Approve current cycle |
| `POST` | `/api/quotes/:id/reject` | Manager | Reject with reason |
| `POST` | `/api/quotes/:id/allocate` | Finance | Split stock across warehouses |
| `POST` | `/api/quotes/:id/confirm` | Finance | Generate invoice & subscriptions |

### Products & Catalog
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/catalog` | Any | Product list with price resolution (cached) |

### Subscriptions & Billing
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/subscriptions` | Customer | List customer subscriptions |
| `PATCH` | `/api/subscriptions/:id` | Customer | Cancel / reactivate / toggle auto-pay |
| `GET` | `/api/invoices` | Customer/Finance | List invoices |
| `POST` | `/api/invoices/:id/pay` | Customer | Mark invoice as paid |

### Payments (Razorpay)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/payments/razorpay/create-order` | Customer | Create Razorpay order |
| `POST` | `/api/payments/razorpay/verify` | Customer | Verify payment & activate subscription |

### Portal (Token-Based)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/portal/:token` | Portal Token | Customer view of a quote |
| `POST` | `/api/portal/:token/negotiate` | Portal Token | Submit counter-offer |

### Dashboard & Analytics
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/metrics` | Manager+ | Pipeline aggregates |
| `GET` | `/api/dashboard/anomalies` | Manager+ | Open anomaly list |
| `GET` | `/api/reports/*` | Manager+ | Detailed analytics |

---

## Business Logic

### Pricing Engine
- **Line Total** = `unitPrice × qty × (1 − discountPct / 100)`, rounded to 2 decimal places
- **Blended Discount** = `discountTotal / subtotal × 100` — used for approval routing
- **Margin** = `(Σ lineTotal − Σ unitCost × qty) / Σ lineTotal × 100`

### Discount Governance
- Each `DiscountRule` maps a `(CustomerTier, ProductCategory)` pair to a `maxAutoApprovePct` and `requiredRole`
- Quotes within thresholds **auto-approve** on submit
- Quotes exceeding thresholds create an `Approval` row and route to the appropriate role

### Warehouse Allocation (Concurrency-Safe)
```sql
SELECT id, "warehouseId", "qtyOnHand"
FROM "Stock"
WHERE "productId" = $1 AND "qtyOnHand" > 0
ORDER BY "qtyOnHand" DESC
FOR UPDATE
```
- Runs inside a serializable Prisma `$transaction`
- Greedily consumes from the largest stock first
- Remainder creates a `BACKORDERED` allocation
- Stock can **never** go negative

### Subscription Proration
For recurring lines starting mid-month:
```
proratedFirst = monthlyAmount × daysRemaining / daysInMonth
```

### Anomaly Detection
Three deterministic rules (no ML):
- `DEEP_DISCOUNT` — blended discount exceeds tier ceiling by >10 points
- `NEGATIVE_MARGIN` — any line where `lineTotal < unitCost × qty`
- `EXCESSIVE_REAPPROVAL` — `reapprovalCount ≥ 3`

---

## Payment Integration

DealFlow360 integrates **Razorpay** for subscription payments:

1. **With valid Razorpay test/live keys** → Opens the official Razorpay Standard Checkout modal
2. **Without keys (demo mode)** → Opens an embedded high-fidelity payment gateway modal with UPI, Card, and NetBanking options

The plan is **only activated** after server-side payment verification succeeds. The verify endpoint creates:
- A `CONFIRMED` quote with line items
- An `ACTIVE` subscription
- A `PAID` invoice with certified line items
- A `Payment` record with the Razorpay transaction reference
- An append-only `AuditLog` entry

---

## Demo Script

1. **Login as Sales Rep** (`rep@dealflow.local`) → Create a new quote for Acme Corporation
2. **Add product lines** → Apply a discount beyond the auto-approve threshold
3. **Submit quote** → Observe it routes to `PENDING_APPROVAL`
4. **Login as Sales Manager** (`manager@dealflow.local`) → See the quote in the approval queue → Approve it
5. **Login as Finance** (`finance@dealflow.local`) → Allocate stock across warehouses → Confirm the quote → Invoice is generated
6. **Login as Customer** (`customer@dealflow.local`) → View billing page → Subscribe to a recurring plan via Razorpay → See active subscription and paid invoice

---

## Team

Built with ❤️ at the **Odoo Hackathon 2026** by:

- **Rathan Paida** — Lead Developer
- **Pavan** — Developer
- **Santhosh** — Developer

---

## License

This project was built for the Odoo Hackathon 2026. All rights reserved.
