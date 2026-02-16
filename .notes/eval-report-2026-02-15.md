# Codebase Evaluation — MedEdPrep Instructor Tools — 2026-02-15

## Critical (fix before shipping)

- **Assessment ownership not enforced**: `routes/assessments.ts:54-62` — `findAssessmentOrThrow()` only checks `id` and `orgId`, never `createdById`. Any admin in the same org can view, edit, delete, publish, close, and see all student responses for assessments they didn't create. 10 endpoints affected (lines 162, 180, 214, 230, 255, 274, 301, 338, 383, 430). Student PII (names, emails, scores) exposed cross-instructor. FERPA/privacy risk.

- **ReviewQuestion type mismatch (studentAnswer/correctAnswer)**: `app/src/types/api.ts:139-148` vs `routes/student-auth.ts:52-61` — Backend returns `unknown` (can be string or array for multi-select questions), but frontend types declare `string`. Causes runtime errors when calling string methods on array values in `app/src/pages/student/AssessmentReview.tsx`.

- **Missing CASCADE delete rules on 4 relations**: `prisma/schema.prisma` — Organization deletion orphans all child records. Affected lines: OrgUser→Organization (line 44), Student→Organization (line 65), Assessment→Organization (line 93), Assessment→OrgUser (line 94). No `onDelete: Cascade` on any of these. Only AssessmentResponse→Assessment (line 130) has cascade.

- **Seed data covers only 2 records (1 org, 1 admin user)**: `prisma/seed.ts:17-41` — Zero assessments, questions, students, or responses seeded. 78% of major features are untestable without manual data creation. QR Code tab (AssessmentDetail.tsx:298) and Item Analysis tab (AssessmentDetail.tsx:300) never render due to conditional logic requiring active assessments and completed responses respectively.

## High Priority (causes user confusion or data bugs)

- **requireRole() middleware defined but never used**: `lib/auth.ts:208-219` — Role-based authorization function exported but zero route uses it. All authenticated admins can access all admin endpoints regardless of role. Token includes role (line 68) but verification never checks it.

- **formatZodErrors() duplicated in 3 files**: Central export at `lib/validate.ts:9-19` exists but ignored. Redefined in `routes/assessments.ts:79-88` and `routes/student-auth.ts:94-103`. Maintenance risk: changes must be made in 3 places.

- **GET /api/auth/me missing try-catch**: `routes/auth.ts:70-86` — Async route with Prisma query has no error handling wrapper. If DB query fails, unhandled error bypasses global error handler and returns raw Node error instead of standard `{ success: false, error }` format.

- **Missing database indexes on foreign keys**: `prisma/schema.prisma` — `Assessment.createdById` (line 78) and `AssessmentResponse.studentId` (line 114) lack indexes despite being used in queries. Affects join performance and student-specific response lookups.

- **Survey data lost on page refresh**: `app/src/pages/admin/AssessmentCreate.tsx:45-46` — SurveyEditor auto-saves only to React state. No localStorage persistence, no `beforeunload` warning. Instructor loses all question work if they accidentally refresh or navigate away.

- **Accessibility: form error messages not linked to inputs**: `app/src/pages/public/CreateAccount.tsx:74-82`, `app/src/pages/Login.tsx:59-66`, `app/src/pages/student/StudentLogin.tsx:69-77` — Error `<p>` tags lack `id` and inputs lack `aria-describedby`. Screen readers don't announce which input has the error. WCAG 2.1 1.3.1 violation.

- **Accessibility: interactive table rows not keyboard navigable**: `app/src/pages/admin/AssessmentList.tsx:110-114`, `app/src/pages/admin/assessment-detail/ItemAnalysisTab.tsx:162-166` — Rows have `onClick` but no `tabIndex` or `onKeyDown`. Keyboard users cannot interact. WCAG 2.1 2.1.1 violation.

- **Accessibility: ToggleSwitch hidden from assistive technology**: `app/src/components/ToggleSwitch.tsx:12-25` — Checkbox uses `sr-only` class which hides from screen readers. No `aria-label` for state context. Screen reader users cannot determine toggle state.

- **Error states missing retry buttons**: `app/src/pages/admin/assessment-detail/QrCodeTab.tsx:67-76` and `app/src/pages/student/StudentDashboard.tsx:76-84` — Error alerts display message but have no retry/refetch action. User must manually refresh the entire page.

## Medium (inconsistency or tech debt)

- **normalizeAnswer() duplicated in 2 files**: `routes/student-auth.ts:38-43` and `lib/services/item-analysis.ts:47-50` — Identical logic for normalizing answers (handling arrays vs strings). Should be extracted to shared utility.

- **param() helper duplicated in 3 route files**: `routes/assessments.ts:12-14`, `routes/public.ts:10-13`, `routes/student-auth.ts:15-18` — Same `Array.isArray(value) ? value[0] : value` pattern. Should be centralized.

- **User role field is unconstrained string**: `prisma/schema.prisma:38` — `role String @default("admin")` allows any string value. Seed uses "owner" (seed.ts:39), default is "admin", but no enum validates values. Could lead to inconsistent role data.

- **No migration history tracked**: `prisma/` — No `migrations/` directory exists. Using `prisma db push` instead of `prisma migrate`. Cannot review schema change history. Risk for production deployments.

- **Brand color #1b5fd0 hardcoded in 14+ locations**: Dashboard.tsx:78,85; AssessmentList.tsx:50,84; AssessmentCreate.tsx:265,283; AssessmentDetail.tsx:241; EditAssessmentDialog.tsx:67; ItemAnalysisTab.tsx:65; QrCodeTab.tsx:86; QrPresenter.tsx:49,94; StatusBadge.tsx:6; ToggleSwitch.tsx:22 — Should use Tailwind theme variable `bg-primary`.

- **publicLimiter rate limiter defined but never applied**: `middleware/rate-limiter.ts:20-30` — Configured for 30 req/min but not used in any `app.use()` call in `app.ts`. Either implement or remove.

- **scorePercentage type chain undocumented**: `prisma/schema.prisma:122` (Decimal) → `lib/services/quiz-scoring.ts:50-51` (number) → `app/src/types/api.ts:38` (string) — Implicit Decimal→number→string conversion chain with no documentation.

- **Form fields not disabled during submission**: `app/src/pages/admin/AssessmentCreate.tsx:50-51,264` — Submit button disabled but input fields remain editable during async submission, creating potential race condition.

- **No unsaved changes warning on edit dialog**: `app/src/pages/admin/assessment-detail/EditAssessmentDialog.tsx:35-62` — Cancel/Escape discards form changes silently.

- **Assessment detail tab state not persisted to URL**: `app/src/pages/admin/AssessmentDetail.tsx:32` — Active tab stored in React state only. Refreshing page always resets to "overview" tab.

- **Health endpoints use non-standard response format**: `routes/health.ts:26-142` — Returns `{ status, timestamp }` instead of standard `{ success: true, data }`. Inconsistent with all other API responses.

- **Item analysis loads all responses into memory**: `routes/assessments.ts:387-423` — Fetches all responses then filters in JavaScript for latest-per-student. Works for typical class sizes but won't scale to 10K+ responses.

- **Public URL generation may fail in subdomain architecture**: `app/src/pages/admin/assessment-detail/utils.ts:16` — Uses `window.location.origin` which returns subdomain origin. May generate incorrect public assessment URLs.

- **Hardcoded form defaults not configurable**: `app/src/pages/admin/AssessmentCreate.tsx:37-44` — Passing score defaults to 70, time limit fallback to 60 (AssessmentDetail.tsx:122). Should be org-level settings.

## Low (cleanup, nice-to-have)

- **Logout endpoints missing auth middleware**: `routes/auth.ts:88-91` and `routes/student-auth.ts:227-230` — Cookie clearing is idempotent so low risk, but inconsistent with security pattern.

- **verifyToken() exported but only used internally**: `lib/auth.ts:88-94` — Only called by requireAuth and requireStudentAuth. Should be module-private.

- **cloneJson() utility candidate**: `routes/public.ts:28-30` — Generic deep-clone function defined inline. Could be centralized for future reuse.

- **Empty state styling inconsistency**: `app/src/components/EmptyState.tsx` component used in some pages, but `app/src/pages/admin/assessment-detail/ResponsesTab.tsx:66` uses inline styled div instead.

- **Pagination state not synced to URL**: `app/src/pages/student/StudentDashboard.tsx:36` and `app/src/pages/admin/AssessmentDetail.tsx:36` — Page number stored in React state, resets on refresh, not shareable.

- **Login page has no recovery path**: `app/src/pages/Login.tsx:47-89` — No "Forgot password?" link, no "Create account" link, no help/support link.

- **No audit logging for assessment modifications**: No tracking of who modified or deleted assessments across the application.

- **EmptyState title uses `<p>` instead of semantic heading**: `app/src/components/EmptyState.tsx:12-20` — Should use `<h2>` or `<h3>` for proper document outline.

- **Student logout has no confirmation dialog**: `app/src/pages/student/StudentDashboard.tsx:43-46` — Immediate logout on click with no "Are you sure?" prompt.

- **ForbiddenError class defined but never used**: `lib/errors.ts:53` — Error class for 403 responses exists but no code throws it.

## Seed Data Gaps

| Record Type                   | Seeded? | UI Renders It?                     | Notes                                              |
| ----------------------------- | ------- | ---------------------------------- | -------------------------------------------------- |
| Organization                  | Yes (1) | Yes — Dashboard, tenant resolver   | slug: "demo"                                       |
| OrgUser (admin)               | Yes (1) | Yes — Login, Dashboard             | role: "owner", email: admin@demo.org               |
| OrgUser (other roles)         | No      | No role-based UI exists            | Only "owner" seeded; "admin" default never tested  |
| Assessment (draft)            | No      | Empty list on AssessmentList.tsx   | Cannot test edit/publish workflow                  |
| Assessment (active)           | No      | QR Code tab never renders          | Cannot test student-facing assessment flow         |
| Assessment (closed)           | No      | Closed status badge never displays | Cannot test closed state                           |
| Assessment (with questions)   | No      | Question display never renders     | Cannot test TakeAssessment, grading, randomization |
| Student                       | No      | StudentLogin always fails          | No student credentials to test                     |
| AssessmentResponse            | No      | ResponsesTab always empty          | Cannot test scoring, pass/fail, item analysis      |
| AssessmentResponse (released) | No      | AssessmentReview inaccessible      | Cannot test student review with explanations       |
| Question metadata             | No      | Explanation/pageNumber never shown | Cannot test educational metadata display           |

## Role Coverage Matrix

| Feature/Page            | Admin (owner)                | Student                   | Public (unauthenticated) | Notes                                 |
| ----------------------- | ---------------------------- | ------------------------- | ------------------------ | ------------------------------------- |
| Login                   | Yes (auth.ts:24)             | Yes (student-auth.ts:180) | N/A                      | Both work                             |
| Dashboard               | Yes (requireAuth)            | Yes (requireStudentAuth)  | N/A                      | Separate dashboards                   |
| Assessment CRUD         | Yes — all ops                | No access                 | N/A                      | **No ownership check between admins** |
| Assessment Responses    | Yes — sees all org responses | Own responses only        | N/A                      | Cross-admin data leak                 |
| Item Analysis           | Yes — any org assessment     | No access                 | N/A                      | Cross-admin data leak                 |
| Take Assessment         | N/A                          | N/A                       | Yes (public.ts:108)      | Only active assessments               |
| Review Results          | N/A                          | Yes if resultsReleased    | N/A                      | Properly gated                        |
| QR Code                 | Yes if active                | N/A                       | N/A                      | Correct                               |
| Role-based restrictions | None enforced                | N/A                       | N/A                      | requireRole() exists but unused       |

## Architecture Notes

**Strengths:**

- Multi-tenancy enforcement is excellent — 100% of Prisma queries include orgId scoping with no gaps found
- API response format (`{ success, data/error }`) is consistently applied across all 22+ endpoints
- Route handler pattern (try/catch/next) is consistent across all route files
- Input validation via Zod schemas covers all POST/PUT endpoints
- Security headers (Helmet CSP), CORS, rate limiting, and cookie options are properly configured
- Sensitive data (correctAnswer, metadata) properly stripped before sending to students via `stripSensitiveData()`
- TanStack Query hooks follow consistent patterns with proper cache invalidation

**Systemic Issues:**

- Authentication vs Authorization gap: Authentication (who are you) is solid; authorization (what can you do) is missing. `requireRole()` was designed but never wired in. `findAssessmentOrThrow()` enforces tenant isolation but not resource ownership.
- Seed-to-feature coverage gap: The minimal seed (2 records) means 78% of the application cannot be exercised without manual setup. This hides bugs and makes onboarding new developers slow.
- Frontend type safety gap: Types in `app/src/types/api.ts` are manually defined, not generated from backend. At least one critical mismatch exists (ReviewQuestion). Consider using a shared types package or code generation.
- Hardcoded UI values: Brand color appears 14+ times as raw hex. Form defaults, thresholds, and fallback values are scattered across components instead of centralized config.
