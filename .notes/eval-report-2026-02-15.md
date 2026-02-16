# Codebase Evaluation — MedEdPrep Instructor Tools — 2026-02-15

## Critical (fix before shipping)

- **Bug report status enum mismatch**: `prisma/schema.prisma:48` defaults to `'open'`, but `routes/bug-reports.ts:32` validates `['pending', 'acknowledged', 'resolved', 'closed']` and creates with `'pending'` at line 116 — Schema default contradicts application logic; status filter queries will miss records created with the default value.

- **No bug report status update endpoint**: `routes/bug-reports.ts` only defines POST (create) and GET (list) — Admins can view bug reports and filter by status, but cannot change status (`pending` → `acknowledged` → `resolved` → `closed`). The entire bug triage workflow is broken.

- **`scorePercentage` type mismatch (backend number vs frontend string)**: Backend sends `number` (`lib/services/quiz-scoring.ts:50-51`, `prisma/schema.prisma:157` Decimal type). Frontend types declare `string` at `app/src/types/api.ts:39,136,156,166` — Score comparisons, sorting, and display may silently fail or produce incorrect results.

- **Missing cascading delete: AssessmentResponse → Student**: `prisma/schema.prisma:166` — No `onDelete` clause. Deleting a Student leaves orphaned AssessmentResponse records with dangling `studentId` foreign keys. Compare to SessionAttendee (line 254) which correctly has `onDelete: Cascade`.

- **setState called during render (infinite re-render risk)**: `app/src/pages/admin/QuestionBankDetail.tsx:333-339` — `setBankForm()` called unconditionally in the render path when `!editMode`. Should use `useEffect`. Causes unnecessary re-renders and potential infinite loops.

## High Priority (causes user confusion or data bugs)

- **Missing cascading deletes on Organization relations**: `prisma/schema.prisma` — BugReport (line 52), OrgUser (line 75), Student (line 98), Assessment (line 128), QuestionBank (line 187), Session (line 234) all reference Organization without `onDelete: Cascade`. Deleting an org orphans all child records.

- **Missing cascading deletes on createdBy (OrgUser) relations**: `prisma/schema.prisma` — Assessment (line 129), QuestionBank (line 188), Session (line 235) reference OrgUser without `onDelete` clause. Deleting an instructor orphans their created records.

- **`requireRole` middleware defined but never used**: `lib/auth.ts:208-219` — Role-based access control is implemented but not applied to any route. Both "owner" and "admin" roles have identical access. If roles are meant to differ, this is a permission gap.

- **`allowStudentReview` flag has no UI toggle**: `prisma/schema.prisma:120` — Field exists and is enforced in `routes/student-auth.ts:289`, but no frontend control lets instructors toggle it. Students may be blocked from review with no way for admins to enable it through the UI.

- **Inconsistent pagination response format**: `routes/bug-reports.ts:172-181` puts `pagination` at top level (`{ success, data, pagination }`). All other paginated routes put pagination inside `data` (`routes/assessments.ts:401`, `routes/question-banks.ts:138-147`). Frontend hooks may not parse correctly.

- **Hardcoded brand color `#1b5fd0` in 35+ locations**: `app/src/components/AdminLayout.tsx:26,36,46,56,66`, `app/src/components/BugReportDialog.tsx:233`, `app/src/components/StatusBadge.tsx:7`, `app/src/components/ToggleSwitch.tsx`, plus 15+ page files — Rebranding requires global search-replace. Should be a CSS variable or Tailwind theme token.

- **Seed data creates only 1 org + 1 admin user**: `prisma/seed.ts:17-41` — No assessments, question banks, sessions, students, responses, or bug reports. Every feature page shows empty states. Major UI paths (assessment lifecycle, attendance tracking, item analysis, student review) are completely untestable without manual data creation.

- **Duplicated `param()` helper in 6 route files**: `routes/assessments.ts:14-16`, `routes/question-banks.ts:11-13`, `routes/sessions.ts:10-12`, `routes/student-auth.ts:17-19`, `routes/public.ts:11-13`, `routes/public-attendance.ts:9-11` — Identical function copy-pasted. Should be a shared utility.

- **Duplicated `formatZodErrors()` in 3 files (centralized version exists)**: `routes/assessments.ts:81-90`, `routes/question-banks.ts:63-72`, `routes/student-auth.ts:39-48` — Centralized version already exists at `lib/validate.ts:9-19` but isn't used by these routes.

## Medium (inconsistency or tech debt)

- **Missing index: SessionAttendee.sessionId**: `prisma/schema.prisma:242-257` — Queried by sessionId alone in `routes/sessions.ts:181,252,282,309`. The composite unique `[sessionId, studentId]` doesn't optimize single-field lookups. Add `@@index([sessionId])`.

- **Missing index: AssessmentResponse.completedAt**: `prisma/schema.prisma:146-171` — Used for ORDER BY in `routes/assessments.ts:378,478`. Add `@@index([assessmentId, completedAt])` for paginated response queries.

- **Inconsistent query validation pattern**: `routes/bug-reports.ts:140-186` uses `validateQuery` middleware. All other routes (`routes/assessments.ts:365-408`, `routes/question-banks.ts:122-154`, `routes/student-auth.ts:186-249`) do inline `schema.parse()` with manual ZodError catch. Should standardize on middleware.

- **Inconsistent delete confirmation UX**: `app/src/pages/admin/QuestionBankDetail.tsx:164,257` uses native `window.confirm()`. `app/src/pages/admin/AssessmentDetail.tsx:420-439` and `app/src/pages/admin/SessionDetail.tsx:242-260` use styled `AlertDialog` component. User experience is jarring.

- **Inconsistent empty state patterns**: Some pages use `EmptyState` component (`app/src/pages/admin/AssessmentList.tsx:78-91`). Others use plain `Card/CardContent` (`app/src/pages/admin/BugReports.tsx:148-154`) or bare `<div>` (`app/src/pages/admin/assessment-detail/ResponsesTab.tsx:70-74`).

- **CheckOutSession has no forward navigation**: `app/src/pages/public/CheckOutSession.tsx:150-170` — After successful checkout, users land on a success screen with no next action or exit path.

- **QuestionBankDetail error states lack navigation**: `app/src/pages/admin/QuestionBankDetail.tsx:301-303` renders `<div>Invalid bank ID</div>` with no back button. Line 330 renders `<div>No data</div>` similarly.

- **Missing loading indicators on mutations**: `app/src/pages/admin/SessionDetail.tsx:65-79` — `handleUpdate()` mutates without showing loading state. Button text doesn't change during mutation.

- **Missing empty state for Item Analysis tab**: `app/src/pages/admin/assessment-detail/ItemAnalysisTab.tsx:148-214` — No explicit handling for `questions.length === 0`. Falls through silently.

- **Bug report GET endpoint uses `optionalAuth`**: `app.ts:130` — The GET endpoint at `routes/bug-reports.ts:140-186` is behind `optionalAuth` but should require full auth since it lists all org bug reports.

- **Duplicated entity finder functions**: `routes/assessments.ts:56-64` (`findAssessmentOrThrow`), `routes/question-banks.ts:40-48` (`findBankOrThrow`), `routes/sessions.ts:18-26` (`findSessionOrThrow`) — Identical patterns that could use a generic utility.

## Low (cleanup, nice-to-have)

- **Unused schema field: `QuestionBankItem.tags`**: `prisma/schema.prisma:198` — Defined as `String[] @default([])` but never populated or queried by any route.

- **Unused schema field: `SessionAttendee.notes`**: `prisma/schema.prisma:249` — Accepted in update validation (`routes/sessions.ts:240`) but never retrieved or displayed in UI.

- **Hardcoded pagination limits**: `app/src/pages/admin/AssessmentDetail.tsx:48` (10), `app/src/pages/admin/BugReports.tsx:82` (20), `app/src/pages/student/StudentDashboard.tsx:37` (10) — Should be centralized in a config.

- **Hardcoded defaults**: Passing score 70% at `app/src/pages/admin/AssessmentCreate.tsx:62`, time limit default 60 min at `app/src/pages/admin/AssessmentDetail.tsx:168`, difficulty range 1-5 at `app/src/pages/admin/QuestionBankDetail.tsx:584-589`, QR polling interval 5000ms at `app/src/pages/admin/QrPresenter.tsx:21`.

- **Hardcoded question choice count**: `app/src/pages/admin/QuestionBankDetail.tsx:140` — Always initializes 4 choices. Not configurable.

- **Health check uses non-standard response format**: `routes/health.ts:26-33` — Returns `{ status, timestamp, version }` instead of `{ success, data }`. Intentional but inconsistent.

- **Inconsistent hook structure**: `app/src/hooks/useBugReports.ts` defines inline `BugReportsResponse` interface despite centralized types existing in `app/src/types/api.ts`.

- **`student-auth.ts:289-299` bypasses error handler**: Returns `res.status(403).json(...)` directly instead of throwing `ForbiddenError` — Inconsistent with centralized error handling pattern.

## Seed Data Gaps

| Record Type        | Seeded? | UI Renders It?   | Notes                                                      |
| ------------------ | ------- | ---------------- | ---------------------------------------------------------- |
| Organization       | Yes (1) | Yes — Dashboard  | `demo` org with slug and subdomain                         |
| OrgUser (Admin)    | Yes (1) | Yes — Dashboard  | `admin@demo.org` / `password123` / role: `owner`           |
| Assessment         | No      | Empty state only | Cannot test lifecycle: draft → active → closed             |
| AssessmentResponse | No      | Empty state only | Cannot test responses tab, item analysis, or scoring       |
| QuestionBank       | No      | Empty state only | Cannot test bank detail, question picker, CSV import       |
| QuestionBankItem   | No      | N/A              | No banks to hold items                                     |
| Session            | No      | Empty state only | Cannot test attendance tracking or QR check-in/check-out   |
| SessionAttendee    | No      | N/A              | No sessions to attend                                      |
| Student            | No      | N/A              | Cannot test student login, dashboard, or review flows      |
| BugReport          | No      | Empty state only | Cannot test status filters, categories, or severity badges |

## Role Coverage Matrix

| Feature/Page                | Admin (owner)        | Admin (admin)              | Student                 | Anonymous     | Notes                                              |
| --------------------------- | -------------------- | -------------------------- | ----------------------- | ------------- | -------------------------------------------------- |
| Login                       | POST /api/auth/login | Same                       | POST /api/student/login | N/A           | Separate auth flows + tokens                       |
| Dashboard                   | /dashboard           | Same (no role distinction) | /student                | N/A           | `requireRole` exists but unused                    |
| Create Assessment           | /assessments/create  | Same                       | No access               | N/A           | No role-based restrictions                         |
| Manage Assessment           | /assessments/:id     | Same                       | No access               | N/A           |                                                    |
| Take Assessment             | N/A                  | N/A                        | N/A                     | /take/:hash   | Public via QR code                                 |
| Review Assessment           | N/A                  | N/A                        | /student/review/:id     | N/A           | Only if `resultsReleased` AND `allowStudentReview` |
| Question Banks              | /question-banks      | Same                       | No access               | N/A           |                                                    |
| Sessions                    | /sessions            | Same                       | No access               | N/A           |                                                    |
| Attend Session              | N/A                  | N/A                        | N/A                     | /attend/:hash | Public via QR code                                 |
| Bug Reports (view)          | /bug-reports         | Same                       | No access               | N/A           | Behind `optionalAuth` — should be `requireAuth`    |
| Bug Reports (submit)        | Via dialog           | Via dialog                 | Via dialog              | Via dialog    | All roles can submit                               |
| Bug Reports (update status) | **NOT POSSIBLE**     | **NOT POSSIBLE**           | N/A                     | N/A           | No PUT/PATCH endpoint exists                       |

## Architecture Notes

**Strengths:**

- Multi-tenancy is well-implemented — every Prisma query includes `orgId` scoping with no violations found
- Centralized error handling via `middleware/errorHandler.ts` with custom error classes (`NotFoundError`, `ValidationError`, `ForbiddenError`)
- No N+1 query patterns detected — item analysis correctly processes in-memory
- All defined backend routes are consumed by frontend — no dead endpoints
- Student and admin auth are properly separated with distinct token types and cookie names
- Cross-org data access is properly prevented

**Systemic Issues:**

- **No shared route utilities** — `param()`, `formatZodErrors()`, and `findXOrThrow()` patterns are duplicated across 6+ files instead of being centralized
- **Validation pattern split** — `validateQuery` middleware exists but most routes use inline parsing. Should pick one approach.
- **Brand color sprawl** — `#1b5fd0` hardcoded in 35+ places instead of being defined once in Tailwind config or CSS variables
- **Minimal seed data** — Only org + admin user seeded. Every feature beyond login shows empty states, making it impossible to test or demo the application without manual data entry.
- **Role system incomplete** — `requireRole` middleware exists at `lib/auth.ts:208-219` but is never applied. The `role` field on OrgUser is a plain `String` with no enum constraint. "owner" vs "admin" distinction has no functional impact.
