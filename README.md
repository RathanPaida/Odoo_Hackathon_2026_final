# DealFlow360

> B2B Quoting, Approval & Fulfillment Platform — Odoo Hackathon 2026.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 · App Router · TypeScript strict |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Cache / Queue | Redis 7 · ioredis · BullMQ |
| Auth | `@node-rs/argon2` (argon2id) + `jose` JWTs + httpOnly cookies |
| Validation | Zod (shared client ↔ server) |
| UI | Tailwind CSS v4 + lucide-react |
| Charts | Recharts |
| Package Manager | pnpm 11 |

---

## Prerequisites

- Node.js **20.x or 22.x LTS** (`node --version`)
- pnpm 11 (`npm i -g pnpm tsx`)
- **PostgreSQL 16** running on `localhost:5432`
- **Redis 7** running on `localhost:6379`

> **Tip:** The easiest way to get Postgres + Redis is Docker (see option A below).  
> If Docker is unavailable, see option B and C for alternatives.

---

## Option A — Docker (Recommended)

### 1. Install Docker Desktop

- Windows: https://docs.docker.com/desktop/setup/install/windows-install/
- Mac: https://docs.docker.com/desktop/setup/install/mac-install/
- Linux: https://docs.docker.com/desktop/setup/install/linux/

> **Windows note:** If Docker Desktop installation fails, use **Rancher Desktop** instead:  
> https://rancherdesktop.io/ — free, open-source, same Docker CLI.

### 2. Start Postgres + Redis

```bash
# From the project root (where docker-compose.yml lives)
docker compose up -d

# Verify both containers are healthy
docker ps
```

You should see two containers: `dealflow360-postgres-1` and `dealflow360-redis-1`.

### 3. Continue to [Project Setup](#project-setup)

---

## Option B — Rancher Desktop (Docker alternative, no license required)

1. Download from https://rancherdesktop.io/
2. Install and start Rancher Desktop
3. In settings, select **dockerd (Moby)** as the container engine
4. Open a terminal — `docker` commands now work identically
5. Run `docker compose up -d` from the project root
6. Continue to [Project Setup](#project-setup)

---

## Option C — Cloud Postgres + Redis (no local Docker at all)

Use free-tier cloud services if you cannot install any container runtime:

### Postgres (free options)
| Service | Free tier | URL |
|---|---|---|
| **Neon** | 0.5 GB, no credit card | https://neon.tech |
| **Supabase** | 500 MB | https://supabase.com |
| **Railway** | $5 credit/month | https://railway.app |
| **Render** | 90-day free | https://render.com |

Steps for Neon (fastest):
1. Go to https://neon.tech → Sign up → Create project → Copy the connection string
2. It looks like: `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`

### Redis (free options)
| Service | Free tier | URL |
|---|---|---|
| **Upstash** | 10,000 req/day free | https://upstash.com |
| **Redis Cloud** | 30 MB free | https://redis.io/cloud |

Steps for Upstash (fastest):
1. Go to https://upstash.com → Sign up → Create database → Copy the Redis URL
2. It looks like: `redis://default:xxxxx@us1-xxx.upstash.io:6379`

### Update `.env` and `.env.local`

```bash
# .env  (Prisma CLI reads this)
DATABASE_URL="postgresql://your-cloud-url-here"
```

```bash
# .env.local  (Next.js reads this)
DATABASE_URL="postgresql://your-cloud-url-here"
REDIS_URL="redis://your-upstash-url-here"
JWT_SECRET="replace-with-32-byte-random-string"
PORTAL_TOKEN_SECRET="replace-with-different-32-byte-string"
ACCESS_TOKEN_TTL="15m"
REFRESH_TOKEN_TTL_DAYS="7"
JWT_REFRESH_SECRET="replace-with-another-32-byte-string"
```

> **Generate secure secrets:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```
> Run it 3 times for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `PORTAL_TOKEN_SECRET`.

---

## Project Setup

Run these steps **after** Postgres and Redis are running (via any option above).

### 1. Install dependencies

```bash
pnpm install
```

### 2. Run database migration

```bash
pnpm prisma migrate dev --name init
```

This creates all 16 tables in Postgres. You should see:
```
✓ Generated Prisma Client
✓ Applied migration `20260905_init`
```

### 3. Seed the database

```bash
pnpm db:seed
```

This creates:
- 4 users (one per role) — all with password `password123`
- 5 customers, 20 products, 3 warehouses
- Discount rules, upsell rules
- 1 pre-seeded quote in `PENDING_APPROVAL`

### 4. Start the dev server

```bash
pnpm dev
```

App runs at http://localhost:3000

### 5. Start the background worker (separate terminal)

```bash
pnpm worker
```

BullMQ worker for anomaly detection and notifications.

---

## Reset to clean state

```bash
pnpm db:reset
```

Drops all tables, re-runs migrations, re-seeds. Should complete in under 15 seconds.

---

## Test users (after seeding)

| Email | Password | Role |
|---|---|---|
| `rep@dealflow360.com` | `password123` | SALES_REP |
| `manager@dealflow360.com` | `password123` | SALES_MANAGER |
| `finance@dealflow360.com` | `password123` | FINANCE |
| `admin@dealflow360.com` | `password123` | ADMIN |

---

## Demo script (full spine)

1. Log in as **SALES_REP** → Create a new quote for a PLATINUM customer
2. Add 3 product lines; set one line to 40% discount
3. Submit the quote → routes to SALES_MANAGER approval queue
4. Log out → log in as **SALES_MANAGER** → Approve the quote
5. Log out → log in as **FINANCE** → Allocate stock across warehouses
6. Confirm the quote → generates invoice with prorated subscription
7. Copy the portal link → open in incognito → submit a counter-offer
8. Manager queue shows the counter-offer as cycle-2 approval
9. Open the Dashboard → see the anomaly flagged for the deep discount

---

## Project structure

```
├── docker-compose.yml        # Postgres 16 + Redis 7
├── prisma/
│   ├── schema.prisma         # Source of truth — 16 models
│   └── seed.ts               # Deterministic seed data
├── worker/
│   └── index.ts              # BullMQ worker (separate process)
└── src/
    ├── middleware.ts          # Edge JWT gate (jose only)
    ├── app/
    │   ├── (auth)/            # login, signup pages
    │   ├── (app)/             # authenticated shell
    │   │   ├── quotes/
    │   │   ├── approvals/
    │   │   ├── dashboard/
    │   │   └── admin/
    │   ├── portal/[token]/    # customer portal (no session)
    │   └── api/               # all route handlers
    └── lib/
        ├── db.ts              # Prisma singleton
        ├── redis.ts           # ioredis singleton
        ├── cache.ts           # Redis cache-aside (300s TTL)
        ├── ratelimit.ts       # Token bucket (portal only)
        ├── audit.ts           # Append-only AuditLog
        ├── auth/              # password, jwt, session, rbac
        ├── contracts/         # Zod schemas (shared)
        └── services/          # Business logic layer
```

---

## Common issues

### `ERR_PNPM_IGNORED_BUILDS` during pnpm install
The `pnpm-workspace.yaml` already has `allowBuilds` configured. If you see this error, run:
```bash
pnpm install --force
```

### `P1000: Authentication failed`
Your `.env` file has the wrong `DATABASE_URL`. Check the credentials match your Postgres setup.

### `P1001: Can't reach database server`
Postgres isn't running. Start Docker (`docker compose up -d`) or verify your cloud DB URL.

### Redis connection refused
Redis isn't running. Start Docker (`docker compose up -d`) or set `REDIS_URL` to your cloud Redis.  
The app degrades gracefully if Redis is down — caching is skipped and rate limiting fails open.

### argon2 / `@node-rs/argon2` build failure
This project uses `@node-rs/argon2` (prebuilt binaries) instead of the `argon2` package. No node-gyp or Visual Studio Build Tools needed on Windows.

---

## Environment variables reference

| Variable | File | Description |
|---|---|---|
| `DATABASE_URL` | `.env` AND `.env.local` | PostgreSQL connection string |
| `REDIS_URL` | `.env.local` | Redis connection string |
| `JWT_SECRET` | `.env.local` | Access token signing secret (32 bytes) |
| `JWT_REFRESH_SECRET` | `.env.local` | Refresh token signing secret (32 bytes) |
| `PORTAL_TOKEN_SECRET` | `.env.local` | Portal token secret (32 bytes) |
| `ACCESS_TOKEN_TTL` | `.env.local` | Access token expiry (default: `15m`) |
| `REFRESH_TOKEN_TTL_DAYS` | `.env.local` | Refresh token expiry in days (default: `7`) |

> `.env` is read by the **Prisma CLI**. `.env.local` is read by **Next.js**. Both need `DATABASE_URL`.
