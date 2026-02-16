# Agent Tasks — Eval Batch 1: Critical Fixes & Backend Cleanup

## Overview

Addresses all 5 critical issues and key high-priority items from the 2026-02-15 eval report: schema integrity gaps, type mismatches, duplicated backend utilities, broken bug report workflow, React anti-pattern, and brand color sprawl.

## Wave Plan

- **Wave 1:** Tasks 1, 2, 3, 4 (parallel — no shared files)
- **Wave 2:** Tasks 5, 6 (parallel — no shared files, depend on Wave 1)

## Integration Checks (after each wave)

```bash
npm run db:push                            # Wave 1 only (schema changes)
npm run lint
cd app && npx tsc --noEmit && npx vite build
```

---

### Task 1: Schema Hardening — Cascade Deletes, Indexes, Bug Status Default

- **Agent:** Codex
- **Branch:** task-1-schema-hardening
- **Depends on:** nothing
- **Files to modify:** `prisma/schema.prisma`

#### Prompt

```
## Context
MedEdPrep Instructor Tools — Prisma 5, PostgreSQL. Multi-tenant app where every record belongs to an Organization.

## Problem
The Prisma schema has 9 relations missing onDelete policies, 2 missing performance indexes, and a BugReport status default that contradicts application code.

## Current State
File: `prisma/schema.prisma`

Missing onDelete policies on these relations:
- Line 52: BugReport → Organization
- Line 75: OrgUser → Organization
- Line 98: Student → Organization
- Line 128: Assessment → Organization
- Line 129: Assessment → OrgUser (createdBy)
- Line 166: AssessmentResponse → Student
- Line 187: QuestionBank → Organization
- Line 188: QuestionBank → OrgUser (createdBy)
- Line 234: Session → Organization
- Line 235: Session → OrgUser (createdBy)

BugReport status default at line 48: `status String @default("open")` — but route validation at `routes/bug-reports.ts:32` accepts only `['pending', 'acknowledged', 'resolved', 'closed']`. The value "open" never appears in route code.

Missing indexes:
- SessionAttendee: no single-field index on sessionId (queried alone in `routes/sessions.ts:181,252,282,309`)
- AssessmentResponse: no composite index on [assessmentId, completedAt] (used for sorted pagination in `routes/assessments.ts:378,478`)

## Changes Required

1. Fix BugReport default: change `@default("open")` to `@default("pending")`

2. Add onDelete policies using this strategy:
   - All → Organization relations: `onDelete: Cascade` (deleting an org removes all its data)
   - AssessmentResponse → Student (line 166): `onDelete: SetNull` (studentId is nullable String?, keep response data for analytics)
   - All → OrgUser createdBy relations (lines 129, 188, 235): `onDelete: Restrict` (createdById is required String, prevent deleting a user who owns content)

3. Add missing indexes:
   - `@@index([sessionId])` on SessionAttendee model
   - `@@index([assessmentId, completedAt])` on AssessmentResponse model

## What NOT to Do
- Do not change any model field types or names
- Do not add new models or fields
- Do not touch any file except schema.prisma
- Do not create migration files — project uses `prisma db push`

## Acceptance Criteria
- [ ] BugReport status defaults to "pending"
- [ ] All 9+ relations have explicit onDelete policies
- [ ] SessionAttendee has @@index([sessionId])
- [ ] AssessmentResponse has @@index([assessmentId, completedAt])
- [ ] `npx prisma validate` passes

## Verification Commands
npx prisma validate
npx prisma format
```

---

### Task 2: Deduplicate Route Utilities — Extract param() and Export formatZodErrors()

- **Agent:** Claude Sonnet
- **Branch:** task-2-route-utils-dedup
- **Depends on:** nothing
- **Files to modify:** `lib/validate.ts`, `lib/route-utils.ts` (new), `routes/assessments.ts`, `routes/question-banks.ts`, `routes/sessions.ts`, `routes/student-auth.ts`, `routes/public.ts`, `routes/public-attendance.ts`

#### Prompt

```
## Context
MedEdPrep Instructor Tools — Express 5 backend. Routes in `routes/`, shared libs in `lib/`.

## Problem
Two utility functions are copy-pasted across route files instead of shared:
- `param()` — identical in 6 route files
- `formatZodErrors()` — identical in 3 route files (canonical version exists in lib/validate.ts but is not exported)

## Current State

`param()` defined locally in:
- routes/assessments.ts:13-16
- routes/question-banks.ts:10-13
- routes/sessions.ts:10-12
- routes/student-auth.ts:17-19
- routes/public.ts:11-13
- routes/public-attendance.ts:9-11

All identical: `function param(value: string | string[]): string { return Array.isArray(value) ? value[0] : value; }`

`formatZodErrors()` defined locally in:
- routes/assessments.ts:81-90
- routes/question-banks.ts:63-72
- routes/student-auth.ts:39-48

The canonical version is internal at lib/validate.ts:9-19 but NOT in the export list at line 57: `export { z, validate, validateQuery, validateParams }`.

## Changes Required

1. Create `lib/route-utils.ts` — export the `param()` function. Include a brief JSDoc: Express 5 compatibility helper for req.params/req.query values.

2. In `lib/validate.ts` — add `formatZodErrors` to the export list at line 57.

3. In all 6 route files — remove local `param()` definition, add `import { param } from '../lib/route-utils';`

4. In routes/assessments.ts, routes/question-banks.ts, routes/student-auth.ts — remove local `formatZodErrors()` definition, add `import { formatZodErrors } from '../lib/validate';`

## What NOT to Do
- Do not change any route handler logic — only change imports
- Do not touch routes/bug-reports.ts (separate task)
- Do not refactor findXOrThrow() helpers — they're model-specific
- Do not change function signatures or behavior

## Acceptance Criteria
- [ ] lib/route-utils.ts exports param()
- [ ] lib/validate.ts exports formatZodErrors
- [ ] No local param() definitions remain in any route file
- [ ] No local formatZodErrors() definitions remain in any route file
- [ ] npm run lint passes
- [ ] npx tsc --noEmit passes

## Verification Commands
npm run lint
npx tsc --noEmit
grep -rn "function param" routes/
grep -rn "function formatZodErrors" routes/
```

---

### Task 3: Fix scorePercentage Type Mismatch

- **Agent:** Codex
- **Branch:** task-3-score-percentage-type
- **Depends on:** nothing
- **Files to modify:** `app/src/types/api.ts`

#### Prompt

```
## Context
MedEdPrep Instructor Tools — React 19 frontend, TypeScript.

## Problem
Backend sends scorePercentage as a number (Prisma Decimal type at schema.prisma:157, converted to number in lib/services/quiz-scoring.ts:50). Frontend types incorrectly declare it as string, causing silent type mismatches.

## Current State
File: app/src/types/api.ts — four interfaces declare scorePercentage as string:
- Line 39 in AssessmentResponse: `scorePercentage?: string;`
- Line 136 in AssessmentSubmitResult: `scorePercentage?: string;`
- Line 156 in AssessmentReviewData: `scorePercentage: string;` (non-optional)
- Line 166 in ResponseDetail: `scorePercentage?: string;`

## Changes Required
Change all four declarations from string to number, preserving optionality:
- Lines 39, 136, 166: `scorePercentage?: number;`
- Line 156: `scorePercentage: number;`

## What NOT to Do
- Do not change any other types in this file
- Do not modify component files
- Do not change field optionality

## Acceptance Criteria
- [ ] All 4 scorePercentage declarations use number type
- [ ] cd app && npx tsc --noEmit passes

## Verification Commands
cd app && npx tsc --noEmit
grep -n "scorePercentage" app/src/types/api.ts
```

---

### Task 4: Fix QuestionBankDetail setState-in-Render Anti-Pattern

- **Agent:** Codex
- **Branch:** task-4-question-bank-setstate
- **Depends on:** nothing
- **Files to modify:** `app/src/pages/admin/QuestionBankDetail.tsx`

#### Prompt

````
## Context
MedEdPrep Instructor Tools — React 19 frontend.

## Problem
setBankForm() is called directly in the render path, causing unnecessary re-renders and potential infinite loops.

## Current State
File: app/src/pages/admin/QuestionBankDetail.tsx, lines 333-339:

The component body contains this outside any hook or handler:
```tsx
if (!editMode) {
  setBankForm({
    title: data.title,
    description: data.description || '',
    subject: data.subject || '',
  });
}
````

This runs every render when editMode is false, triggering another render via setState.

## Changes Required

Move this logic into a useEffect that syncs bankForm state from data when not in edit mode. The effect should depend on [data, editMode] and only set form state when editMode is false and data has changed. Remove the bare conditional from the render path.

## What NOT to Do

- Do not refactor the rest of the component
- Do not change the bankForm state shape
- Do not add dependencies or libraries
- Do not touch other files

## Acceptance Criteria

- [ ] setBankForm is no longer called in the render path
- [ ] Form state syncs from server data via useEffect
- [ ] Entering editMode preserves user changes (effect doesn't overwrite during edit)
- [ ] cd app && npx tsc --noEmit passes

## Verification Commands

cd app && npx tsc --noEmit
cd app && npm run lint

```

---

### Task 5: Bug Report Status Management — Endpoint, Auth, Pagination, and UI

- **Agent:** Claude Sonnet
- **Branch:** task-5-bug-report-status
- **Depends on:** Task 1 (schema default fix should land first)
- **Files to modify:** `routes/bug-reports.ts`, `app/src/hooks/useBugReports.ts`, `app/src/pages/admin/BugReports.tsx`

#### Prompt

```

## Context

MedEdPrep Instructor Tools — Express 5, Prisma 5, React 19, shadcn/ui, TanStack Query v5. Bug reports submitted by anyone, managed by admins.

## Problem

Three issues with bug reports:

1. No endpoint to update bug report status — admins can see reports but can't act on them
2. GET response puts pagination at top level (`{ success, data, pagination }`) instead of inside data like other endpoints
3. GET endpoint needs requireAuth inline since the router uses optionalAuth (correct for POST, wrong for GET)

## Current State

Backend — routes/bug-reports.ts:

- Lines 29-33: listBugReportsSchema with status enum ['pending', 'acknowledged', 'resolved', 'closed']
- Lines 39-135: POST / — submit bug report (uses optionalAuth correctly)
- Lines 140-186: GET / — list reports. Uses validateQuery middleware. Response at lines 172-181 returns `{ success: true, data: reports, pagination: { page, limit, total, totalPages } }`
- No PUT/PATCH endpoint exists
- requireAuth is available from lib/auth.ts

Frontend hook — app/src/hooks/useBugReports.ts:

- Lines 5-13: BugReportsResponse type: `{ data: BugReport[], pagination: { page, limit, total, totalPages } }`
- Lines 41-47: useQuery fetches and parses this format

Frontend page — app/src/pages/admin/BugReports.tsx:

- Lines 86-87: Extracts data?.data and data?.pagination
- Lines 101-123: Status filter dropdown (read-only)
- Lines 197-199: Status shown as read-only Badge in table

Pattern to follow for paginated response: routes/assessments.ts:401 returns `{ success: true, data: { responses, total, page, limit } }`
Pattern to follow for mutation + toast: app/src/pages/admin/AssessmentDetail.tsx:153-162

## Changes Required

1. In routes/bug-reports.ts — add PATCH /:id endpoint:
   - Add requireAuth middleware inline on this route (import from lib/auth.ts)
   - Validate body: `{ status: z.enum(['pending', 'acknowledged', 'resolved', 'closed']) }`
   - Find report by id AND orgId (multi-tenancy), throw NotFoundError if missing
   - Update status, return `{ success: true, data: updatedReport }`

2. In routes/bug-reports.ts — add requireAuth inline on GET / route

3. In routes/bug-reports.ts — fix GET pagination response to: `{ success: true, data: { reports, total, page, limit, totalPages } }`

4. In app/src/hooks/useBugReports.ts:
   - Update BugReportsResponse type to match new `{ data: { reports, total, page, limit, totalPages } }` shape
   - Add useUpdateBugReport mutation hook — PATCH /api/bug-reports/:id
   - Invalidate ['bug-reports'] query key on success

5. In app/src/pages/admin/BugReports.tsx:
   - Update data extraction to match new response shape
   - In each table row, replace the read-only status Badge with a Select dropdown (same options as the filter: pending, acknowledged, resolved, closed)
   - On change, call update mutation. Show toast on success/error.

## What NOT to Do

- Do not modify the POST (create) endpoint or the BugReportDialog component
- Do not touch app.ts middleware mounting
- Do not add delete functionality
- Do not change the bug report Zod create schema

## Acceptance Criteria

- [ ] PATCH /api/bug-reports/:id updates status with auth + orgId check
- [ ] GET endpoint requires authentication via inline middleware
- [ ] GET response uses `{ success, data: { reports, total, page, limit, totalPages } }` format
- [ ] Frontend hook parses new response format correctly
- [ ] Admin can change bug report status via dropdown in the table
- [ ] npm run lint passes
- [ ] cd app && npx tsc --noEmit passes

## Verification Commands

npm run lint
cd app && npx tsc --noEmit
cd app && npx vite build

```

---

### Task 6: Centralize Brand Color — Replace Hardcoded #1b5fd0

- **Agent:** Gemini
- **Branch:** task-6-brand-color-cleanup
- **Depends on:** nothing (can run in Wave 1 or Wave 2)
- **Files to modify:** All files under `app/src/` containing `#1b5fd0` (15+ files)

#### Prompt

```

## Context

MedEdPrep Instructor Tools — React 19, Tailwind CSS. Brand color is #1b5fd0.

## Problem

The brand color is hardcoded as arbitrary Tailwind values (bg-[#1b5fd0], text-[#1b5fd0], etc.) in 35+ places across 15+ files. It's already defined in the Tailwind theme at app/tailwind.config.js:17 as primary.500, so utility classes like bg-primary-500, text-primary-500, border-primary-500 are available but unused.

## Current State

Tailwind config at app/tailwind.config.js:14-20 defines:
primary: {
DEFAULT: 'hsl(var(--primary))',
foreground: 'hsl(var(--primary-foreground))',
50: '#eff5ff',
100: '#dbeafe',
500: '#1b5fd0',
600: '#1651b8',
700: '#1143a0',
}

Known files with hardcoded values (non-exhaustive list):

- app/src/components/AdminLayout.tsx (lines 26, 36, 46, 56, 66)
- app/src/components/BugReportDialog.tsx
- app/src/components/ToggleSwitch.tsx
- app/src/components/StatusBadge.tsx
- app/src/pages/public/AttendSession.tsx
- app/src/pages/public/CheckOutSession.tsx
- Plus assessment, question bank, session, student, and dashboard pages

Replacement patterns:

- bg-[#1b5fd0] → bg-primary-500
- bg-[#1b5fd0]/90 → bg-primary-500/90
- hover:bg-[#1b5fd0]/90 → hover:bg-primary-500/90
- hover:bg-[#1b5fd0] → hover:bg-primary-500
- text-[#1b5fd0] → text-primary-500
- border-[#1b5fd0] → border-primary-500
- Inline style color/backgroundColor '#1b5fd0' → convert to Tailwind className
- SVG stroke/fill="#1b5fd0" → use currentColor with text-primary-500 on parent, or keep hex if unreachable by Tailwind

## Changes Required

Search ALL files under app/src/ for #1b5fd0 (case-insensitive). Replace every occurrence with the corresponding primary-500 Tailwind utility class. Verify zero occurrences remain after changes.

## What NOT to Do

- Do not modify app/tailwind.config.js
- Do not change app/src/index.css CSS variables
- Do not change component behavior or layout
- Do not introduce new CSS classes or utilities
- Do not touch files outside app/src/

## Acceptance Criteria

- [ ] Zero occurrences of #1b5fd0 in app/src/
- [ ] All replacements use primary-500 Tailwind classes
- [ ] Visual appearance unchanged (same color)
- [ ] cd app && npx tsc --noEmit && npx vite build passes
- [ ] cd app && npm run lint passes

## Verification Commands

cd app && npm run lint
cd app && npx tsc --noEmit
cd app && npx vite build
grep -ri "#1b5fd0" app/src/

```

---

## Remaining Items (follow-up batch)

These items from the eval report are deferred:

- **Seed data expansion** — Needs assessments, students, responses, sessions, bug reports. Large standalone task.
- **Standardize all pagination formats** — Assessment responses and question bank item lists also differ from each other.
- **Inconsistent empty state components** — Some pages use EmptyState, others use bare divs.
- **Missing loading indicators** — SessionDetail and other pages missing isPending feedback on mutations.
- **Dead-end page navigation** — CheckOutSession success screen, QuestionBankDetail error states, CreateAccount page lack back buttons.
- **requireRole middleware activation** — Decide if owner/admin should differ, then apply.
```
