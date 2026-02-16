# Agent Tasks — Pre-Deploy Hardening + Instructor Management

## Overview

Prepare the app for production deployment by adding RBAC enforcement, hardening environment configuration, and building a full instructor management feature so the org owner can add/edit instructors from the UI.

## Wave Plan

- **Wave 1:** Tasks 1, 2 (parallel — no shared files)
- **Wave 2:** Tasks 3, 4 (parallel — Task 3 depends on Task 1; no shared files between 3 and 4)

## Integration Checks (after each wave)

```bash
cd app && npx tsc --noEmit && npx vite build
npm run lint
```

---

### Task 1: Add requireRole Middleware + Enforce on Bug Reports

- **Agent:** Codex
- **Branch:** task-1-rbac-middleware
- **Depends on:** nothing
- **Files to modify:** `lib/auth.ts`, `routes/bug-reports.ts`

#### Prompt

```
You are working on MedEdPrep Instructor Tools (Express 5, Prisma 5, TypeScript).

## Context

The app has authentication via `requireAuth` middleware in `lib/auth.ts`, but no role-based access control. The `req.user` object already includes a `role` field (string — values are "owner" or "admin"). See `types/express.d.ts` for the `AuthUser` interface.

## Problem

All authenticated users can access all routes equally. We need a `requireRole` middleware factory so sensitive routes can restrict access by role.

## Current State

- `lib/auth.ts` — Contains `requireAuth` (line 99-147) which sets `req.user` with id, orgId, email, name, role. There is no role-checking middleware.
- `routes/bug-reports.ts` — Has GET (list) and PATCH (update status) routes that should be owner-only, but currently only use `requireAuth` via the mount in `app.ts`.
- `types/express.d.ts` — Augments Express Request with `user?: AuthUser` where AuthUser has `role: string`.

## Changes Required

1. **In `lib/auth.ts`**, add a `requireRole` middleware factory after `requireAuth`:
   - Signature: `requireRole(...roles: string[])` returning Express middleware
   - It MUST be used AFTER `requireAuth` (it reads `req.user.role`)
   - If `req.user` is undefined, return 401 UNAUTHORIZED
   - If `req.user.role` is not in the allowed roles array, return 403 with `{ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }`
   - Export it as a named export

2. **In `routes/bug-reports.ts`**, import `requireRole` from `../lib/auth.js` and add `requireRole('owner')` to the GET (list all) and PATCH (update status) route handlers. These are the routes that already have comments saying "admin only". Apply it as inline middleware on each route handler, not at the router level — because the POST route (submit bug report) uses `optionalAuth` and must stay open.

## What NOT to Do

- Do NOT modify `app.ts` or any other route files
- Do NOT change the role field type or add enums to the schema
- Do NOT refactor `requireAuth` — leave it exactly as-is
- Do NOT add role checks to assessment, question-bank, or session routes (those stay open to all authenticated users for now)

## Acceptance Criteria

- [ ] `requireRole` exported from `lib/auth.ts`
- [ ] `requireRole('owner')` applied to bug report GET and PATCH handlers
- [ ] Non-owner users receive 403 on those endpoints
- [ ] Existing POST bug report route still works without auth
- [ ] TypeScript compiles: `npx tsc --noEmit`

## Verification Commands

npx tsc --noEmit
npm run lint
```

---

### Task 2: Production Environment Hardening

- **Agent:** Codex
- **Branch:** task-2-prod-env-hardening
- **Depends on:** nothing
- **Files to modify:** `.env.example`, `prisma/seed.ts`, `docker-compose.yml`, `scripts/create-admin.ts`

#### Prompt

```
You are working on MedEdPrep Instructor Tools (Express 5, Prisma, PostgreSQL, TypeScript).

## Context

The app is about to be deployed to production for the first time. Several files have development-only values that would be dangerous in production.

## Problem

1. The seed script runs unconditionally — if someone runs `npm run db:seed` in production, it creates demo users with `password123`.
2. Docker-compose has hardcoded database credentials.
3. The `.env.example` doesn't clearly guide production setup.
4. The `create-admin` script works but doesn't handle first-time production setup where no organization exists yet.

## Current State

- `.env.example` — Has placeholder values but no production guidance. See the file for current content.
- `prisma/seed.ts` — Creates a "Demo Organization" (slug: demo), two admin users (admin@demo.org / password123, instructor@demo.org / password123), 8 students, sample assessments, etc. Runs unconditionally.
- `docker-compose.yml` — Hardcodes `POSTGRES_USER: mededprep`, `POSTGRES_PASSWORD: mededprep_dev`, `POSTGRES_DB: mededprep_inst`.
- `scripts/create-admin.ts` — Interactive CLI that lists existing orgs, prompts for user details, creates an OrgUser with role "owner". Does NOT create organizations — requires one to already exist.

## Changes Required

1. **`prisma/seed.ts`** — Add a NODE_ENV guard at the very top of the `main()` function (before any database operations). If `process.env.NODE_ENV === 'production'`, log an error message: "Seed script is disabled in production. Use `npm run create-admin` to create your first user." and `process.exit(1)`. Leave all other seed logic untouched.

2. **`docker-compose.yml`** — Replace the three hardcoded environment values with variable substitution that falls back to dev defaults:
   - `POSTGRES_USER: ${POSTGRES_USER:-mededprep}`
   - `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-mededprep_dev}`
   - `POSTGRES_DB: ${POSTGRES_DB:-mededprep_inst}`

3. **`.env.example`** — Rewrite to have two clear sections with comments:
   - A "Required" section: DATABASE_URL, JWT_SECRET (with note: "generate with `openssl rand -hex 32`"), NODE_ENV, PORT
   - An "Application" section: CORS_ORIGINS, APP_BASE_URL
   - A "Development Only" section: DEV_ORG_SLUG (with note: "Remove in production")
   - An "Optional" section: LOG_LEVEL, IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT
   - Use placeholder values that clearly indicate they must be changed (e.g., `JWT_SECRET=CHANGE_ME_generate_with_openssl_rand_hex_32`)

4. **`scripts/create-admin.ts`** — Add an option to create a new organization before creating the admin user. After listing existing orgs, add a "[+] Create new organization" option. If selected, prompt for org name and slug, then create the org and proceed to user creation. This allows first-time production setup without needing the seed script.

## What NOT to Do

- Do NOT modify `server.ts`, `app.ts`, or any route files
- Do NOT delete or restructure the seed data itself — just add the guard
- Do NOT change the actual `.env` file (only `.env.example`)
- Do NOT add npm dependencies

## Acceptance Criteria

- [ ] `npm run db:seed` exits with error when NODE_ENV=production
- [ ] `npm run db:seed` still works normally in development
- [ ] docker-compose.yml uses env variable substitution with dev fallbacks
- [ ] `.env.example` has clear production guidance with sections
- [ ] `create-admin` script can create a new org + first admin user
- [ ] TypeScript compiles: `npx tsc --noEmit`

## Verification Commands

npx tsc --noEmit
NODE_ENV=production npx tsx prisma/seed.ts 2>&1 | grep -q "disabled in production" && echo "PASS: seed guard works"
```

---

### Task 3: Instructor CRUD Backend API

- **Agent:** Codex
- **Branch:** task-3-instructor-api
- **Depends on:** Task 1 (uses `requireRole` from `lib/auth.ts`)
- **Files to modify:** `routes/instructors.ts` (new), `app.ts`

#### Prompt

```
You are working on MedEdPrep Instructor Tools (Express 5, Prisma 5, TypeScript).

## Context

The app uses multi-tenant scoping — every request has `req.orgId` set by the tenant resolver middleware. Admin users are stored in the `OrgUser` model (see `prisma/schema.prisma`). There is currently no API for managing users — they can only be created via seed script or CLI.

## Problem

The org owner needs to add, edit, and deactivate instructors from the web UI. We need a backend API for instructor/user CRUD.

## Current State

- `prisma/schema.prisma` — `OrgUser` model has: id, orgId, email, password, name, role (string, default "admin"), isActive (boolean), lastLoginAt, createdAt, updatedAt. Unique constraint on [orgId, email].
- `lib/auth.ts` — Exports `requireAuth` and `requireRole` middleware. `requireRole('owner')` restricts to owner-role users.
- `app.ts` — Mounts route modules at lines 122-130. Follow the same pattern to mount the new instructor routes.
- `routes/sessions.ts` — Good reference for the route pattern: imports, Router(), Zod schemas, async handlers with try/catch, standard API response format `{ success: true, data }`.
- `lib/validate.ts` — Exports `z` (Zod) and `validate` function.
- `lib/errors.ts` — Exports `NotFoundError`, `ValidationError`.

## Changes Required

1. **Create `routes/instructors.ts`** with these endpoints:

   **GET `/`** — List all org users for the current org.
   - Query: `prisma.orgUser.findMany({ where: { orgId: req.orgId }, select: { ... } })` — select all fields EXCEPT `password`.
   - Order by `createdAt` desc.
   - Return `{ success: true, data: users }`.

   **POST `/`** — Create a new instructor.
   - Zod schema: `{ email: string (email format), name: string (min 1), password: string (min 8), role: string (optional, default "admin") }`.
   - Validate role is either "admin" or "owner".
   - Hash password with bcrypt (salt 12) — import from `bcrypt` (already a project dependency).
   - Handle unique constraint violation (duplicate email) — return 409 with message "A user with this email already exists".
   - Return created user (excluding password).

   **PATCH `/:id`** — Update an instructor.
   - Zod schema: `{ name?: string, email?: string, role?: string, isActive?: boolean }`.
   - If role is provided, validate it's "admin" or "owner".
   - Prevent owner from deactivating themselves (compare `req.user.id` with `:id` param when `isActive: false`).
   - If email changes, handle unique constraint violation.
   - Return updated user (excluding password).

   **DELETE `/:id`** — Deactivate (soft-delete) an instructor.
   - Set `isActive: false` (do NOT delete the row).
   - Prevent owner from deactivating themselves.
   - Return `{ success: true, data: { message: 'User deactivated' } }`.

   All handlers must scope queries with `WHERE orgId = req.orgId`. Follow the exact error response format: `{ success: false, error: { code, message } }`.

2. **In `app.ts`**, import and mount the instructor routes:
   - Import: `import instructorRoutes from './routes/instructors.js';`
   - Mount: `app.use('/api/instructors', generalLimiter, requireAuth, requireRole('owner'), instructorRoutes);`
   - Place it after the sessions route mount (line 126) and before the public routes (line 127).
   - Import `requireRole` alongside the existing `requireAuth` import.

## What NOT to Do

- Do NOT modify the Prisma schema or create migrations
- Do NOT add password reset or invite-by-email functionality
- Do NOT modify any existing route files
- Do NOT add frontend code

## Acceptance Criteria

- [ ] All 4 endpoints exist and return correct response shapes
- [ ] All queries scoped to `req.orgId`
- [ ] Passwords are hashed and never returned in responses
- [ ] Owner cannot deactivate themselves
- [ ] Duplicate email returns 409
- [ ] Routes require owner role (via mount-level middleware)
- [ ] TypeScript compiles: `npx tsc --noEmit`

## Verification Commands

npx tsc --noEmit
npm run lint
```

---

### Task 4: Frontend Instructor Management Page

- **Agent:** Claude Sonnet
- **Branch:** task-4-instructor-ui
- **Depends on:** Task 3 (needs API endpoints), Task 1 (role field used for conditional nav)
- **Files to modify:** `app/src/pages/admin/InstructorList.tsx` (new), `app/src/hooks/useInstructors.ts` (new), `app/src/types/api.ts`, `app/src/App.tsx`, `app/src/components/AdminLayout.tsx`

#### Prompt

```
You are working on MedEdPrep Instructor Tools (React 19, TanStack Query v5, shadcn/ui, Tailwind, TypeScript).

## Context

The app has a new backend API at `/api/instructors` (GET, POST, PATCH, DELETE) that is restricted to users with role "owner". We need a frontend page so owners can manage instructors. The user's role is available via `useAuthStore` from `@/lib/auth`.

## Problem

There is no UI for managing instructors/users. The org owner needs to add, edit, and deactivate instructors from the admin panel.

## Current State

- `app/src/hooks/useAttendance.ts` — Reference pattern for TanStack Query hooks. Uses `api` and `ensureSuccess` from `@/lib/api`. Follow this pattern exactly.
- `app/src/pages/admin/SessionList.tsx` — Reference pattern for a list page with create dialog, loading/error/empty states, table display. Follow this pattern exactly.
- `app/src/types/api.ts` — Where frontend API types are defined. Currently has Assessment, Session, etc.
- `app/src/App.tsx` — Router config. Admin routes are nested inside `ProtectedRoute > AdminLayout` (lines 44-62).
- `app/src/components/AdminLayout.tsx` — Nav bar with NavLink components for each section.
- `app/src/lib/auth.ts` — Exports `useAuthStore` with Zustand. `user` object has `{ id, email, name, role, orgId }`.
- `app/src/components/ui/` — Has shadcn components: Button, Dialog, Input, Label, Table, Card, Alert, Skeleton, Badge, Select.
- `app/src/components/EmptyState.tsx` — Reusable empty state component.

## API Contract

The backend endpoints (all require owner role):

- `GET /api/instructors` → `{ success: true, data: Instructor[] }`
- `POST /api/instructors` → body: `{ email, name, password, role? }` → `{ success: true, data: Instructor }`
- `PATCH /api/instructors/:id` → body: `{ name?, email?, role?, isActive? }` → `{ success: true, data: Instructor }`
- `DELETE /api/instructors/:id` → `{ success: true, data: { message } }`

Instructor type:
  id: string
  email: string
  name: string
  role: string       // "owner" or "admin"
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string

## Changes Required

1. **Add `Instructor` type to `app/src/types/api.ts`** — Add the Instructor interface at the end of the file.

2. **Create `app/src/hooks/useInstructors.ts`** — Follow the `useAttendance.ts` pattern exactly:
   - `useInstructors()` — GET query, queryKey: `['instructors']`
   - `useCreateInstructor()` — POST mutation, invalidates `['instructors']`
   - `useUpdateInstructor()` — PATCH mutation, invalidates `['instructors']`
   - `useDeactivateInstructor()` — DELETE mutation, invalidates `['instructors']`

3. **Create `app/src/pages/admin/InstructorList.tsx`** — Follow the `SessionList.tsx` pattern:
   - Table columns: Name, Email, Role (as a Badge), Status (active/inactive Badge), Last Login (formatted or "Never"), Created
   - "Add Instructor" button opens a create dialog with fields: Name, Email, Password, Role (select: "admin" or "owner")
   - Row click or edit button opens an edit dialog (name, email, role, active toggle)
   - Use `toast` from `sonner` for success/error feedback (same as SessionList)
   - Handle loading, error, and empty states using the same pattern as SessionList

4. **Update `app/src/App.tsx`** — Add route inside the admin layout block:
   - Import `InstructorList` from `./pages/admin/InstructorList`
   - Add `<Route path="instructors" element={<InstructorList />} />` after the bug-reports route

5. **Update `app/src/components/AdminLayout.tsx`** — Add an "Instructors" NavLink:
   - Place it after the "Bug Reports" link
   - **Conditionally render it**: only show if `user?.role === 'owner'`
   - Use the same NavLink className pattern as the other links

## What NOT to Do

- Do NOT modify any backend files
- Do NOT add new shadcn components — use only what's already in `app/src/components/ui/`
- Do NOT add password change/reset functionality
- Do NOT add a detail page — keep it as a single list page with dialogs
- Do NOT add search, filtering, or pagination (keep it simple for now)

## Acceptance Criteria

- [ ] Instructor list page renders with table at `/instructors`
- [ ] Create dialog adds a new instructor
- [ ] Edit dialog updates instructor name, email, role, active status
- [ ] "Instructors" nav link only visible to users with role "owner"
- [ ] Loading, error, and empty states handled
- [ ] TypeScript compiles: `cd app && npx tsc --noEmit`
- [ ] Frontend builds: `cd app && npx vite build`

## Verification Commands

cd app && npx tsc --noEmit
cd app && npx vite build
cd app && npm run lint
```
