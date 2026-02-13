# MedEdPrep Product Template

Standard boilerplate for all `mededprep.app` products. Copy, rename, build.

## Quick Start

### Prerequisites

- Node.js 20 (`nvm use`)
- Docker (for PostgreSQL)

### 1. Clone & Rename

```bash
cp -r mededprep-template mededprep-yourproduct
cd mededprep-yourproduct
git init
```

### 2. Search & Replace Placeholders

| Placeholder | Replace with         | Example              |
| ----------- | -------------------- | -------------------- |
| `PRODUCT`   | Product display name | `Clinicals`          |
| `XXXX`      | Product slug / port  | `clinicals` / `3001` |
| `SLUG`      | Subdomain slug       | `clinicals`          |

Files to update: `package.json`, `app/package.json`, `docker-compose.yml`, `.env.example`, `server.js`, `app/vite.config.ts`, `CLAUDE.md`

### 3. Install & Configure

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, PORT

npm install
cd app && npm install && cd ..
npx husky
```

### 4. Database Setup

```bash
docker-compose up -d
npm run db:push       # Push schema to DB (dev only)
npm run db:seed       # Create demo org + admin
```

### 5. Run

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd app && npm run dev
```

Login at http://localhost:5173 with `admin@demo.org` / `password123`

## Adding Features

1. **Add Prisma models** in `prisma/schema.prisma`, then `npm run db:migrate`
2. **Add API routes** in `routes/`, mount in `app.js`
3. **Add React pages** in `app/src/pages/`, wire in `app/src/App.tsx`
4. **Add hooks** in `app/src/hooks/` using TanStack Query

## What's Included

- **Backend:** Express 5 + Prisma 5 + PostgreSQL, JWT auth, Zod validation, Pino logging, rate limiting, health checks
- **Frontend:** React 19 + TypeScript + Vite, TanStack Query, shadcn/ui + Tailwind, Zustand auth store
- **Tooling:** ESLint (backend + frontend), Prettier, Husky pre-commit hooks, lint-staged
- **CI:** GitHub Actions (lint, typecheck, build on PR)
- **Multi-tenant:** Subdomain-based org resolution, `req.orgId` on every request

## Directory Structure

```
mededprep-template/
├── server.js              # Express entry point
├── app.js                 # Express app (testable, no .listen())
├── lib/                   # Backend utilities
│   ├── auth.js            # JWT + requireAuth + requireStudentAuth
│   ├── errors.js          # Error classes (7 types with toJSON)
│   ├── validate.js        # Zod body/query/params middleware
│   ├── prisma.js          # Prisma singleton
│   └── logger.js          # Pino structured logging
├── middleware/
│   ├── tenantResolver.js  # Subdomain → org with 5min cache
│   ├── errorHandler.js    # Central error handler
│   └── rate-limiter.js    # Auth, public, general limiters
├── routes/
│   ├── auth.js            # Login, /me, logout, refresh
│   └── health.js          # Liveness, DB, detailed diagnostics
├── prisma/
│   ├── schema.prisma      # Organization, OrgUser, Student
│   └── seed.js            # Demo org + admin
├── scripts/
│   ├── create-org.js      # Interactive org creation
│   └── create-admin.js    # Interactive admin creation
├── app/                   # React frontend
│   └── src/
│       ├── lib/           # api.ts, auth.ts, utils.ts
│       ├── pages/         # Login.tsx, Dashboard.tsx
│       └── components/ui/ # shadcn/ui (button, card, input, label)
├── docker-compose.yml     # PostgreSQL 16-alpine
└── .github/workflows/     # CI pipeline
```

## Conventions

- **API responses:** `{ success: true, data: {...} }` / `{ success: false, error: { code, message } }`
- **Auth cookies:** `admin-token`, `student-token` (httpOnly, sameSite: lax)
- **Brand color:** `#1b5fd0`
- **All queries scoped:** `WHERE orgId = req.orgId`
- **db: prefix** for all Prisma scripts (`db:migrate`, `db:seed`, etc.)
