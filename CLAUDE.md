# CLAUDE.md

## Project Overview

**MedEdPrep Instructor Tools** — Assessment creation, QR-code delivery, and item analysis platform for EMS instructors.
URL: https://inst.mededprep.app | Repo: https://github.com/Je-lus/mededprep-inst

**Tech stack:** Express 5, Prisma 5, PostgreSQL, React 19, TanStack Query v5, shadcn/ui, Tailwind, Zustand, SurveyJS
**Ports:** Backend 9001, frontend dev 9000. Vite proxies `/api` and `/storage` to backend.

## Key Commands

docker-compose up -d               # Start PostgreSQL
npm run dev                        # Backend API on :9001
cd app && npm run dev              # Frontend on :9000
npm run db:migrate                 # Run migrations
npm run db:push                    # Push schema
npm run db:seed                    # Seed demo data
cd app && npm run build            # Production build
npm run lint                       # Lint backend
cd app && npm run lint             # Lint frontend
cd app && npm run typecheck        # TypeScript check

## Database

PostgreSQL on localhost:5432, database `mededprep_inst` (user: `mededprep` / `mededprep_dev`).

## Multi-Tenancy

Every request scoped via subdomain. Dev: `X-Org-Slug` header or `DEV_ORG_SLUG` env var.
All Prisma queries MUST include `WHERE orgId = req.orgId`.

## Auth & Test Credentials

- **Admin:** `admin@demo.org` / `password123` → POST `/api/auth/login`
- **Org slug:** `demo`

## Critical Patterns

- **API responses:** `{ success: true, data }` or `{ success: false, error: { code, message } }`
- **Brand color:** `#1b5fd0`
- SurveyJS license initialized via `app/src/lib/surveyjs-license.ts`
- Question metadata (explanation, difficulty, page number) stored in SurveyJS element `metadata` property

## Multi-Agent Workflow

Run `/director` to plan a batch. Shared tooling at `../workflow/`. See `AGENTS.md` for executor instructions.
