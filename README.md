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
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed development data |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm docker:up` | Start Docker services |
| `pnpm docker:down` | Stop Docker services |

## Milestone Progress

- [x] **M1**: Monorepo scaffold & infra
- [ ] **M2**: Database schema & migrations
- [ ] **M3**: Auth & user profile
- [ ] **M4**: Communities & membership
- [ ] **M5**: Availability & background location
- [ ] **M6**: SOS & fan-out
- [ ] **M7**: Responder flow & live map
- [ ] **M8**: Emergency contacts & public tracking
- [ ] **M9**: Resolve flow, reports, strikes
- [ ] **M10**: Admin panel
- [ ] **M11**: Load test
- [ ] **M12**: Community onboarding & drills
- [ ] **M13**: Metrics & feedback
- [ ] **M14**: Privacy, reliability & deployment

## License

Private — All rights reserved.
