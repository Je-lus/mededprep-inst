# Codebase Structure

**Analysis Date:** 2026-02-23

## Directory Layout

```
mededprep-inst/
├── app/                              # React 19 frontend (separate package)
│   ├── src/
│   │   ├── pages/                    # Page components
│   │   │   ├── admin/                # Instructor dashboard pages
│   │   │   ├── student/              # Student dashboard pages
│   │   │   ├── public/               # Public-facing pages (take assessment, attend session)
│   │   │   ├── Login.tsx             # Admin login
│   │   │   ├── Welcome.tsx           # Role selection
│   │   │   └── Dashboard.tsx         # Admin home
│   │   ├── components/               # Reusable React components
│   │   │   ├── ui/                   # shadcn/ui primitives
│   │   │   ├── AdminLayout.tsx       # Main admin wrapper
│   │   │   ├── StudentLayout.tsx     # Student wrapper
│   │   │   ├── SurveyEditor.tsx      # SurveyJS editing
│   │   │   └── ErrorBoundary.tsx     # Error fallback
│   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── useAssessments.ts     # Assessment CRUD + queries
│   │   │   ├── useQuestionBanks.ts   # Question bank ops
│   │   │   ├── useStudentAuth.ts     # Student login/logout
│   │   │   └── [others]
│   │   ├── lib/                      # Frontend utilities
│   │   │   ├── api.ts                # Fetch wrapper, error handling
│   │   │   ├── auth.ts               # Admin auth state checks
│   │   │   ├── student-auth.ts       # Student auth state
│   │   │   └── surveyjs-license.ts   # SurveyJS license init
│   │   ├── types/                    # TypeScript interfaces
│   │   │   └── api.ts                # API response shapes
│   │   ├── App.tsx                   # Routes definition
│   │   ├── main.tsx                  # Entry point
│   │   └── index.css                 # Global styles
│   ├── dist/                         # Production build output
│   ├── package.json                  # Frontend deps (React, Tailwind, shadcn, SurveyJS)
│   └── vite.config.ts                # Vite bundler config (proxy to backend)
├── lib/                              # Backend business logic
│   ├── auth.ts                       # JWT generation, verification, middleware
│   ├── errors.ts                     # Custom error classes
│   ├── logger.ts                     # Pino logger
│   ├── prisma.ts                     # Prisma client instance, graceful shutdown
│   ├── validate.ts                   # Zod validation utilities
│   ├── imagekit.ts                   # ImageKit SDK for image uploads
│   ├── route-utils.ts                # Express 5 param helpers
│   └── services/                     # Domain-specific services
│       ├── csv-import.ts             # CSV → SurveyJS JSON conversion
│       ├── item-analysis.ts          # Test analysis (difficulty, discrimination)
│       ├── quiz-scoring.ts           # Score calculation, review generation
│       ├── randomization.ts          # Question/choice shuffling
│       └── __tests__/                # Service unit tests
├── middleware/                       # Express middleware
│   ├── tenantResolver.ts             # Org extraction from subdomain/header + caching
│   ├── errorHandler.ts               # Centralized error response formatting
│   ├── rate-limiter.ts               # Per-endpoint rate limiting
│   └── optionalAuth.ts               # Middleware for optional authentication
├── routes/                           # API endpoint handlers
│   ├── assessments.ts                # CRUD + QR code + responses + item analysis
│   ├── auth.ts                       # Login, logout, token refresh
│   ├── student-auth.ts               # Student login, signup, password reset
│   ├── public.ts                     # Public assessment taking, response submission
│   ├── public-attendance.ts          # QR code session attendance
│   ├── question-banks.ts             # Question bank CRUD
│   ├── sessions.ts                   # Session CRUD
│   ├── students.ts                   # Student listing, management
│   ├── instructors.ts                # Instructor CRUD (owner only)
│   ├── student-stats.ts              # Student dashboard, past responses
│   ├── bug-reports.ts                # Bug report submission
│   └── health.ts                     # Liveness probe
├── scripts/                          # One-off utilities
│   ├── create-admin.ts               # CLI: Create org + admin user
│   └── create-org.ts                 # CLI: Create organization
├── types/                            # Shared TypeScript definitions
│   ├── express.d.ts                  # Express Request augmentation (orgId, user, student)
│   └── survey.ts                     # SurveyJS interfaces
├── prisma/                           # Database schema
│   ├── schema.prisma                 # Prisma models + enums
│   ├── seed.ts                       # Demo data seeding
│   └── migrations/                   # Prisma migrations
├── app.ts                            # Express app factory (separated for testability)
├── server.ts                         # Express server startup
├── package.json                      # Backend deps + scripts
├── tsconfig.json                     # TypeScript config
├── .eslintrc.cjs                     # ESLint rules
├── .prettierrc                       # Code formatter config
└── vitest.config.ts                  # Unit test runner config
```

## Directory Purposes

**`app/src/pages/`:**

- Purpose: Full-page React components, one per route
- Contains: Admin pages (Assessment/QuestionBank/Session/Student lists), Student pages, Public pages
- Routing: Defined in `App.tsx` with React Router v6

**`app/src/pages/admin/`:**

- Purpose: Instructor-facing pages (authentication required)
- Key files:
  - `AssessmentList.tsx`: Table of assessments with create/edit/delete actions
  - `AssessmentCreate.tsx`: Multi-step form: import CSV → configure → publish
  - `AssessmentDetail.tsx`: Tabs: Overview, Responses, Item Analysis, QR Code
  - `QuestionBankDetail.tsx`: View, edit, import questions from assessments

**`app/src/pages/admin/assessment-detail/`:**

- Purpose: Modular components for AssessmentDetail tabs
- Files: OverviewTab, ResponsesTab, ItemAnalysisTab, QrCodeTab, ResponseDetailDialog

**`app/src/pages/public/`:**

- Purpose: Unauthenticated pages (public links)
- Key files:
  - `TakeAssessment.tsx`: SurveyJS rendered assessment, handles submission
  - `AttendSession.tsx`: QR session registration
  - `CheckOutSession.tsx`: Session checkout confirmation

**`app/src/pages/student/`:**

- Purpose: Authenticated student pages
- Key files:
  - `StudentDashboard.tsx`: List past responses, view scores
  - `AssessmentReview.tsx`: Detailed review of submitted assessment with explanations
  - `StudentLogin.tsx`: Student authentication
  - `ForgotPassword.tsx`, `ResetPassword.tsx`: Password recovery flow

**`app/src/components/ui/`:**

- Purpose: shadcn/ui primitive components (Button, Card, Dialog, Select, etc.)
- Source: Pre-built from shadcn CLI, customized with Tailwind

**`app/src/hooks/`:**

- Purpose: Custom React Query hooks abstracting API calls
- Pattern: Each hook factory creates useQuery/useMutation for specific resource
- Example: `useAssessments()` → GET, `useCreateAssessment()` → POST with invalidation
- All hooks use `ensureSuccess()` to throw ApiError on non-success response

**`app/src/lib/api.ts`:**

- Purpose: Centralized fetch client with error handling
- Features:
  - Automatic `credentials: 'include'` for cookie-based auth
  - 30s request timeout with AbortController
  - 401 redirect to login if session expired
  - Typed response wrapper: `ApiResponse<T> = { success, data?, error?, pagination? }`
  - Convenience methods: `api.get()`, `api.post()`, `api.put()`, `api.delete()`

**`lib/services/`:**

- Purpose: Pure functions for business logic, testable in isolation
- No database dependency (passed as parameter); no side effects
- Examples:
  - `parseCsvToSurveyJson(csvContent: string)`: Parses TSV, validates questions, groups by chapter, returns { surveyJson, questionCount, warnings }
  - `computeItemAnalysis(responses, surveyJson)`: Iterates responses, calculates per-question metrics
  - `buildReviewQuestions(responseData, surveyJson)`: Enriches submission with explanations, difficulty

**`routes/`:**

- Purpose: Express route handlers, one file per resource
- Naming: Snake-case resource name (assessments.ts, question-banks.ts, student-auth.ts)
- Pattern: Import Router, define POST/GET/PUT/DELETE handlers, call services, return `{ success: true, data }`

**`middleware/`:**

- Purpose: Express middleware stacks; mounted in order in app.ts
- Order in app.ts: helmet → CORS → body parsers → pino logging → health check (no tenant) → tenant resolver → routes → error handler

**`types/express.d.ts`:**

- Purpose: Augment Express Request type with custom properties
- Extensions: `req.orgId`, `req.org`, `req.user`, `req.student`, `req.validatedQuery`
- Allows type-safe access in route handlers without casting

**`prisma/`:**

- Purpose: Database schema and migrations
- Files:
  - `schema.prisma`: Multi-tenant models (Organization, OrgUser, Student, Assessment, Response, etc.)
  - `seed.ts`: Creates demo org, users, assessments for development
  - `migrations/`: Auto-generated SQL migrations from schema changes

**`scripts/`:**

- Purpose: CLI utilities for one-off operations
- Usage: `npm run create-admin` (interactive), `npm run create-org`

## Key File Locations

**Entry Points:**

| Endpoint       | Backend                | Frontend           |
| -------------- | ---------------------- | ------------------ |
| Server startup | `server.ts`            | `app/src/main.tsx` |
| Express app    | `app.ts`               | —                  |
| Routes         | `routes/`              | `app/src/App.tsx`  |
| Database       | `prisma/schema.prisma` | —                  |

**Configuration:**

| Purpose                  | File                                                 |
| ------------------------ | ---------------------------------------------------- |
| Backend environment vars | Server checks at startup (JWT_SECRET, DATABASE_URL)  |
| Vite build config        | `app/vite.config.ts` (proxy /api, /storage to :9001) |
| TypeScript               | `tsconfig.json`, `app/tsconfig.json`                 |
| ESLint                   | `.eslintrc.cjs`                                      |
| Prettier                 | `.prettierrc`                                        |
| Git hooks                | `.husky/`, `package.json` lint-staged                |

**Core Logic:**

| Feature            | Backend                         | Frontend                                                                      |
| ------------------ | ------------------------------- | ----------------------------------------------------------------------------- |
| Assessment CRUD    | `routes/assessments.ts`         | `app/src/hooks/useAssessments.ts`, `app/src/pages/admin/AssessmentCreate.tsx` |
| CSV import         | `lib/services/csv-import.ts`    | `app/src/pages/admin/AssessmentCreate.tsx`                                    |
| Student submission | `routes/public.ts`              | `app/src/pages/public/TakeAssessment.tsx`                                     |
| Item analysis      | `lib/services/item-analysis.ts` | `app/src/pages/admin/assessment-detail/ItemAnalysisTab.tsx`                   |
| Authentication     | `routes/auth.ts`, `lib/auth.ts` | `app/src/lib/auth.ts`, `app/src/pages/Login.tsx`                              |

**Testing:**

| Layer            | Location                           | Runner |
| ---------------- | ---------------------------------- | ------ |
| Backend services | `lib/services/__tests__/*.test.js` | Vitest |
| Frontend         | `app/src/__tests__/` (if any)      | Vitest |

## Naming Conventions

**Files:**

| Type             | Pattern                              | Example                                      |
| ---------------- | ------------------------------------ | -------------------------------------------- |
| API routes       | snake-case                           | `question-banks.ts`, `public-attendance.ts`  |
| React pages      | PascalCase                           | `AssessmentList.tsx`, `StudentDashboard.tsx` |
| React components | PascalCase                           | `AdminLayout.tsx`, `SurveyEditor.tsx`        |
| Custom hooks     | camelCase with `use` prefix          | `useAssessments.ts`, `useStudentAuth.ts`     |
| Services         | snake-case                           | `csv-import.ts`, `item-analysis.ts`          |
| Middleware       | snake-case                           | `error-handler.ts`, `rate-limiter.ts`        |
| Tests            | filename.test.js or filename.spec.js | `csv-import.test.js`                         |
| Utilities        | camelCase                            | `utils.ts`, `constants.ts`                   |
| Prisma types     | PascalCase (auto-generated)          | `Assessment`, `Student`, `Organization`      |

**Directories:**

| Type               | Pattern    | Example                             |
| ------------------ | ---------- | ----------------------------------- |
| Feature grouping   | lowercase  | `pages/admin/`, `components/ui/`    |
| URL-based grouping | kebab-case | `assessment-detail/` sub-components |

**Code Identifiers:**

| Type                 | Pattern            | Example                                                        |
| -------------------- | ------------------ | -------------------------------------------------------------- |
| Variables, functions | camelCase          | `assessmentId`, `parseAssessment()`, `calculateScore()`        |
| Constants            | UPPER_SNAKE_CASE   | `JWT_EXPIRY`, `CACHE_TTL_MS`, `REQUIRED_COLUMNS`               |
| React components     | PascalCase         | `Assessment`, `ResponseDetail`                                 |
| API endpoints        | kebab-case in path | `/api/question-banks`, `/api/public-attendance`                |
| Database columns     | camelCase (Prisma) | `assessmentId`, `studentEmail`, `scorePercentage`              |
| Enums                | lowercase          | `AssessmentStatus` (enum), values: `draft`, `active`, `closed` |

## Where to Add New Code

**New Feature (e.g., new assessment type, new student workflow):**

1. **Backend:**
   - Define database model in `prisma/schema.prisma`
   - Add migration: `npm run db:migrate`
   - Create/extend route handler in `routes/`
   - Add service logic in `lib/services/` if reusable
   - Add validation schema via Zod in route handler
   - Add error cases to `lib/errors.ts` if new error type

2. **Frontend:**
   - Create page in `app/src/pages/` (or sub-directory if grouped)
   - Create custom hook in `app/src/hooks/` for API integration
   - Add route to `app/src/App.tsx` router definition
   - Create components in `app/src/components/` if reusable
   - Add types to `app/src/types/api.ts`

3. **Testing:**
   - Add service tests in `lib/services/__tests__/`
   - Use Vitest with helper functions (makeCsv, etc.)
   - No tests found for route handlers; add if needed

**New Component/Module (reusable across pages):**

- **UI Component:** `app/src/components/MyComponent.tsx`, export as function component
- **Custom Hook:** `app/src/hooks/useMyFeature.ts`, abstract API calls + state management
- **Service:** `lib/services/my-service.ts`, pure functions with clear inputs/outputs
- **Utility:** `app/src/lib/utils.ts` (frontend) or `lib/route-utils.ts` (backend)

**Example: Add new student report card:**

1. Route: `routes/students.ts` → Add `GET /api/students/:id/report`
2. Service: `lib/services/student-reporting.ts` → Calculate attendance, scores, trends
3. Frontend page: `app/src/pages/admin/StudentReportCard.tsx`
4. Hook: `app/src/hooks/useStudentReport.ts` → useQuery to fetch
5. Types: Add to `app/src/types/api.ts`
6. Tests: `lib/services/__tests__/student-reporting.test.js`

**Utilities & Helpers:**

- **Shared backend:** `lib/route-utils.ts` (Express helpers), `lib/validate.ts` (Zod)
- **Shared frontend:** `app/src/lib/utils.ts`, `app/src/lib/constants.ts`
- **Data transformations:** Consider `lib/services/` for reusable logic

## Special Directories

**`app/dist/`:**

- Purpose: Production-built frontend bundle
- Generated: `npm run build` in app directory
- Committed: No (in .gitignore)
- Served: By Express static middleware in production; Vite dev server in dev

**`prisma/migrations/`:**

- Purpose: Auto-generated SQL migration files
- Generated: `npm run db:migrate` (creates SQL + metadata)
- Committed: Yes (source control for schema history)
- Manual edit: Not recommended (Prisma manages)

**`app/node_modules/`, `node_modules/`:**

- Purpose: Installed dependencies
- Generated: `npm install`
- Committed: No (in .gitignore)

**`samplecsv/`:**

- Purpose: Sample CSV files for testing import
- Committed: Yes (developer reference)

**`.planning/codebase/`:**

- Purpose: GSD codebase analysis documents (this file)
- Committed: Yes (shared context)
