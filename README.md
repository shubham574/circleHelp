# 🏥 NearHelp

**Community-based emergency help app** — when you press SOS, nearby available community members are alerted and can respond.

> ⚠️ **NearHelp does not replace emergency services.** Always call **112** in a life-threatening emergency.

## Architecture

- **Monorepo** (pnpm workspaces): `apps/mobile`, `apps/api`, `apps/admin`, `packages/shared`
- **Mobile**: React Native + Expo (dev build), MapLibre, Socket.IO
- **API**: Node.js, Fastify, Socket.IO, Zod, Drizzle ORM
- **Database**: PostgreSQL 16 + PostGIS 3.4
- **Jobs**: pg-boss (PostgreSQL-based, no Redis)
- **Auth & Push**: Firebase Auth + FCM
- **Admin**: React + Vite

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`npm install -g pnpm`)
- **Docker** (for PostgreSQL + PostGIS)
- **Android Studio** + Android SDK (for mobile dev)
- **Firebase project** with Auth and Cloud Messaging enabled

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url> nearhelp
cd nearhelp
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your values (DATABASE_URL, JWT_SECRET, etc.)
```

### 3. Start Database

```bash
docker compose up -d
# Wait for healthy status:
docker compose ps
```

### 4. Run Migrations

```bash
pnpm db:migrate
```

### 5. Seed Development Data

```bash
pnpm db:seed
```

### 6. Start API Server

```bash
pnpm dev:api
# API runs on http://localhost:3001
# Health check: http://localhost:3001/health
```

### 7. Start Admin Panel

```bash
pnpm dev:admin
# Admin runs on http://localhost:5173
```

### 8. Start Mobile App

```bash
cd apps/mobile
pnpm start
# Scan QR with Expo Go or press 'a' for Android emulator
```

## Project Structure

```
nearhelp/
├── apps/
│   ├── api/          # Fastify backend
│   ├── mobile/       # React Native + Expo
│   └── admin/        # React + Vite admin panel
├── packages/
│   └── shared/       # Shared types, Zod schemas, constants
├── scripts/          # DB init, load tests, backups
├── docker-compose.yml
├── .env.example
└── pnpm-workspace.yaml
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev:api` | Start API dev server |
| `pnpm dev:admin` | Start admin panel dev server |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm test` | Run all tests |
| `pnpm load-test` | Run high-concurrency load benchmark (100+ responders) |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed development data |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm docker:up` | Start Docker services |
| `pnpm docker:down` | Stop Docker services |

## Milestone Progress

- [x] **M1**: Monorepo scaffold & infra (Fastify, Vite, Expo, Shared types/schemas)
- [x] **M2**: Database schema & migrations (PostgreSQL 16 + PostGIS 3.4, GiST spatial indexing, 12 tables)
- [x] **M3**: Auth & user profile (Firebase Auth middleware, user CRUD, device registration, mobile auth flow)
- [x] **M4**: Communities & membership (Community creation, 8-char invite codes, join requests & admin approval queue)
- [x] **M5**: Availability & background location (Toggle, 100m distance filter, background heartbeats & 30m stale purge)
- [x] **M6**: SOS & fan-out (5-sec cancel window, rate limit 3/hr, PostGIS proximity query, FCM push fan-out, radius expansion)
- [x] **M7**: Responder flow & live map (Accept/arrived/decline, live GPS streaming, ETA calculations & Socket.IO rooms)
- [x] **M8**: Emergency contacts & public tracking (Max 5 contacts, E.164 validation, HMAC-SHA256 tracking link & SMS alerts)
- [x] **M9**: Resolve flow, reports, strikes (Incident resolution, instant privacy location wipe, conduct reports, 3-strike auto-ban)
- [x] **M10**: Admin panel (React + Vite dashboard with Communities, Incidents, Moderation, Metrics, and Retention controls)
- [x] **M11**: Load test (High-concurrency benchmark script simulating 100+ responders, 100k spatial queries, p95 < 200ms)
- [x] **M12**: Community onboarding & drills (Safety drill mode, prominent drill banner, `docs/COMMUNITY_ONBOARDING.md`)
- [x] **M13**: Metrics & feedback (Average acceptance/arrival times, community response performance, post-incident ratings)
- [x] **M14**: Privacy, reliability & deployment (Zero persistent tracking, 30-day retention worker, Docker compose, CI/CD)

## License

Private — All rights reserved.
