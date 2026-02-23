# Architecture

**Analysis Date:** 2026-02-23

## Pattern Overview

**Overall:** Full-stack multi-tenant SPA with Express 5 backend serving React 19 frontend over a shared codebase.

**Key Characteristics:**

- Multi-tenant architecture scoped by organization subdomain (production) or `X-Org-Slug` header (development)
- Request-scoped org context via middleware: every API request carries `req.orgId` and `req.org`
- Express as separate app module (`app.ts`) decoupled from server start (`server.ts`) for testability
- Database-agnostic routing — no implicit pagination or implicit filtering; all queries must explicitly scope by orgId
- Server-rendered SPA with Vite-based frontend dev, shadcn/ui component library
- SurveyJS-based assessment engine for question rendering and scoring

## Layers

**Presentation (Frontend):**

- Purpose: Interactive UI for instructors, students, and public users
- Location: `app/src/`
- Contains: React components (page components, layout components, UI primitives), custom hooks for API integration
- Depends on: API client (`app/src/lib/api.ts`), TanStack Query for state management
- Used by: End users via browser

**API Layer (Express Routes):**

- Purpose: REST endpoints for resource operations (assessments, responses, users, sessions)
- Location: `routes/`
- Contains: Route handlers organized by resource (assessments, auth, public, students, etc.)
- Depends on: Services (`lib/services/`), Prisma client, auth middleware
- Used by: Frontend via HTTP; public endpoints used by QR code attendees

**Middleware Layer:**

- Purpose: Cross-cutting concerns applied to requests before routing
- Location: `middleware/`
- Contains: Tenant resolver, error handler, authentication (admin + student), rate limiting
- Key files:
  - `tenantResolver.ts`: Extracts org from subdomain/header, caches org lookups (5min TTL)
  - `errorHandler.ts`: Centralized error response formatting (AppError, Prisma, Multer)
  - `rate-limiter.ts`: Per-endpoint rate limits (auth 5req/15min, submit 3req/hour, general 100req/15min)
  - `optionalAuth.ts`: Allows both authenticated and public requests

**Business Logic (Services):**

- Purpose: Reusable domain logic separate from routes
- Location: `lib/services/`
- Key services:
  - `csv-import.ts`: Parses TSV files into SurveyJS JSON structure; groups by chapter into pages
  - `item-analysis.ts`: Computes difficulty index, discrimination index, distractor analysis from response data
  - `quiz-scoring.ts`: Calculates score, builds review questions with explanation/difficulty/references
  - `randomization.ts`: Randomizes question and choice order per-student

**Data Persistence (ORM):**

- Purpose: Database abstraction and query builder
- Location: `lib/prisma.ts`, `prisma/schema.prisma`
- Prisma 5 manages schema, migrations, and client generation
- Schema defines multi-tenant models (Organization → OrgUser, Student, Assessment, Response, etc.)

**Utilities:**

- Purpose: Shared helpers across backend and frontend
- Location: `lib/` (backend), `app/src/lib/` (frontend)
- Backend utilities:
  - `auth.ts`: JWT generation, token verification, cookie management (4h expiry)
  - `validate.ts`: Zod schema validation with error formatting
  - `logger.ts`: Pino logger instance
  - `route-utils.ts`: Express 5 compatibility helper (params can be string | string[])
  - `errors.ts`: Custom error classes (AppError, ValidationError, NotFoundError, etc.)
- Frontend utilities:
  - `api.ts`: Fetch wrapper with typed responses, 401 redirect, timeout handling
  - `auth.ts`: Admin token check (checks cookie or Authorization header)
  - `student-auth.ts`: Student token check
  - Constants and US state list

## Data Flow

**Admin Assessment Creation:**

1. Instructor accesses `app/src/pages/admin/AssessmentCreate.tsx`
2. User selects CSV file, clicks "Import"
3. `useParseCsv()` hook calls `POST /api/assessments/parse-csv`
4. Backend route calls `parseCsvToSurveyJson()` from `lib/services/csv-import.ts`
5. CSV parsed into SurveyJS JSON (pages grouped by chapter, questions with metadata)
6. Frontend receives warnings (missing choices, invalid answers) and parsed JSON
7. Instructor configures title, passing score, randomization, timing settings
8. `useCreateAssessment()` calls `POST /api/assessments` with full payload
9. Backend creates Assessment record (surveyJson stored as JSON column)
10. Assessment assigned public hash for sharing via QR code
11. Assessment is in `draft` status until instructor clicks "Publish"

**Student Assessment Submission:**

1. Public visitor scans QR code or receives link to `take/:publicHash`
2. Frontend loads `TakeAssessment` page, fetches assessment via `GET /api/public/assessment/:hash`
3. SurveyJS renders questions based on assessment config (randomize, oneQuestionPerPage, timeLimitMinutes)
4. Student submits answers via `POST /api/public/assessment/:hash/submit`
5. Backend calculates score using `buildReviewQuestions()` from `lib/services/quiz-scoring.ts`
6. Response stored with responseData (answers), totalCorrect, scorePercentage, timeTaken
7. If assessment has `resultsReleased=true`, score returned immediately; else deferred
8. Student can later create account and review past responses via `GET /api/student/responses/:id`

**Item Analysis Report:**

1. Instructor clicks "Item Analysis" tab in AssessmentDetail
2. Frontend queries `GET /api/assessments/:id/item-analysis`
3. Backend calls `computeItemAnalysis()` from `lib/services/item-analysis.ts`
4. For each question: computes difficulty (% correct), discrimination (Pearson correlation with total score), distractor counts
5. Response returned as ItemAnalysisResult with per-question metrics
6. Frontend displays using recharts (bar/line charts)

**Attendance Session Flow:**

1. Instructor creates Session and publishes
2. Students scan QR or enter session code at `attend/:publicHash`
3. Frontend posts to `POST /api/public/attendance/:hash/register`
4. Backend records SessionAttendee with status `registered`
5. Student checks in with `PATCH /api/public/attendance/:hash/check-in`
6. Session updated to status `checked_in`
7. After session, instructor marks as `attended` or `no_show`

## State Management

**Backend:**

- Stateless HTTP requests. Session state via JWT in httpOnly cookies or Authorization header.
- Organization context injected per-request via middleware (req.orgId, req.org).
- Org cache in tenantResolver to reduce DB lookups (5min TTL, manual invalidation on org updates).

**Frontend:**

- TanStack Query (React Query v5) for server state caching and synchronization.
- Custom hooks (useAssessments, useResponses, etc.) abstract API calls and invalidation logic.
- Zustand may be used for UI-only state (e.g., modal open/close) — verify with component files.
- Auth tokens stored in httpOnly cookies (backend-set); frontend checks cookie presence for auth state.

## Key Abstractions

**Assessment:**

- Purpose: Represents a quiz/test with SurveyJS configuration
- Files: `routes/assessments.ts`, `app/src/pages/admin/AssessmentCreate.tsx`, `app/src/hooks/useAssessments.ts`
- Properties: title, surveyJson (JSON), passingScore, timeLimitMinutes, randomizeQuestions, oneQuestionPerPage, resultsReleased
- Lifecycle: draft → active (published) → closed
- SurveyJS metadata: Each question element stores difficulty, explanation, pageNumber in element.metadata

**AssessmentResponse:**

- Purpose: Records student submission to an assessment
- Files: `routes/public.ts`, `lib/services/quiz-scoring.ts`
- Stores: responseData (Q&A map), questionOrder (randomized order), questionTimings, totalCorrect, scorePercentage, passed
- Unique constraint: (assessmentId, studentEmail, attempt) — allows retakes

**SurveyJS Element:**

- Purpose: Encodes question, choices, correct answer, and metadata
- Type: 'radiogroup' (single choice) or 'checkbox' (multiple)
- Metadata: { difficulty, explanation, pageNumber, category, chapter, etc. }
- Example structure:
  ```json
  {
    "type": "radiogroup",
    "name": "Q001",
    "title": "What is X?",
    "choices": [{"value": "A", "text": "Option A"}, ...],
    "correctAnswer": "A",
    "metadata": {"difficulty": 3, "explanation": "...", "chapter": "Airway"}
  }
  ```

**Organization (Tenant):**

- Purpose: Root of multi-tenancy hierarchy
- Fields: id, slug (unique), subdomain, isActive
- Relationships: owns OrgUsers, Students, Assessments, Sessions, QuestionBanks, BugReports
- Cache: tenantResolver caches org lookups by slug (5min TTL)

## Entry Points

**Backend Server:**

- Location: `server.ts`
- Triggers: `npm run dev` (tsx --watch) or production start
- Responsibilities: Validates environment (JWT_SECRET, DATABASE_URL), initializes Express app from `app.ts`, listens on port 9001, handles SIGINT/SIGTERM for graceful shutdown

**Express App:**

- Location: `app.ts`
- Triggers: Imported by `server.ts`
- Responsibilities: Stacks middleware (helmet, CORS, pinoHttp), mounts route groups, serves static frontend in production

**Frontend Entry:**

- Location: `app/src/main.tsx`
- Triggers: Vite dev server or production SPA load
- Mounts React app to #root DOM element
- Initializes SurveyJS license via `app/src/lib/surveyjs-license.ts`

**Route Groups (mounted in app.ts):**

- `GET /health` → `routes/health.ts` (no auth, no tenant)
- `POST /api/auth/*` → `routes/auth.ts` (rate-limited, before tenant resolver)
- `POST /api/public/attendance/:hash/*` → `routes/public-attendance.ts` (no auth, no tenant)
- `POST /api/assessments/*` → `routes/assessments.ts` (requireAuth after tenant resolver)
- `GET /api/public/*` → `routes/public.ts` (no auth, after tenant resolver)
- `POST /api/student/*` → `routes/student-auth.ts` or `routes/student-stats.ts` (requireStudentAuth)

## Error Handling

**Strategy:** Centralized handler catches all errors and formats as `{ success: false, error: { code, message, details? } }`.

**Patterns:**

1. **Custom Errors (AppError subclasses):**
   - Thrown in routes/services: `throw new NotFoundError('Assessment not found')`
   - Caught by errorHandler, serialized with statusCode + code + message
   - Example: `ValidationError` → 400, 'VALIDATION_ERROR', field-level details

2. **Prisma Errors:**
   - Handled in errorHandler.ts via error.code:
   - P2002 (unique constraint) → 409 'CONFLICT'
   - P2025 (record not found) → 404 'NOT_FOUND'
   - P2003 (foreign key missing) → 400 'VALIDATION_ERROR'

3. **Validation Errors:**
   - Zod schemas in route handlers throw via `throw new ValidationError(msg, details)`
   - Details object maps field names to error messages: `{ title: 'required', email: 'invalid format' }`

4. **Rate Limit Errors:**
   - express-rate-limit returns 429 with default text; may wrap in errorHandler if customization needed

5. **Auth Errors:**
   - Invalid token → 401 'UNAUTHORIZED'
   - Missing token → 401 'UNAUTHORIZED'
   - Token org mismatch → 401 'UNAUTHORIZED'

## Cross-Cutting Concerns

**Logging:**

- Backend: Pino logger at `lib/logger.ts`, configured in pinoHttp middleware (app.ts)
- Logs HTTP requests with method, URL, status, response time (auto via pino-http)
- Manual logging with `req.log` or `logger.error/info/debug`
- Frontend: No structured logging; errors caught in ErrorBoundary component

**Validation:**

- Backend: Zod schemas for request body/params/query; `validate()` middleware wraps and throws ValidationError
- Frontend: React Hook Form in many pages; client-side UI validation (shadcn inputs with error states)

**Authentication:**

- Backend: JWT tokens signed with JWT_SECRET (4h expiry); stored in httpOnly cookies or Authorization header
- Two token types: 'admin' (OrgUser) and 'student' (Student), both scoped to orgId
- Token verification checks: valid signature, not expired, correct type, orgId matches request tenant
- Frontend: Checks cookie presence or calls `/api/auth/verify` to determine logged-in state

**Authorization:**

- Admin: `requireAuth` middleware validates admin token and user isActive; `requireRole()` factory checks role (owner, admin, etc.)
- Student: `requireStudentAuth` validates student token; separate from admin auth flow
- Org scoping: All database queries include `WHERE orgId = req.orgId` (enforced per-route, not global)

**Rate Limiting:**

- Per-endpoint limits configured in middleware/rate-limiter.ts
- Auth endpoints: 5 requests / 15 minutes per IP
- Submit endpoints: 3 requests / 1 hour per IP
- General: 100 requests / 15 minutes per IP
- Prevents brute force, spam submissions, CSV import spam

**Tenant Isolation:**

- Org extraction in tenantResolver (subdomain → slug lookup or dev header)
- Org context attached to request: `req.orgId`, `req.org`
- All queries require explicit `WHERE orgId = req.orgId`
- No default scope filter — requires discipline to include in every query
- Cache in middleware prevents repeated DB lookups during the same session
