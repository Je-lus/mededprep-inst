# Agent Tasks — Features Batch 2 (Live Results, Question Bank, Attendance)

## Overview

Adds three features: live results polling for active assessments, a question bank with CRUD + assessment integration, and standalone QR-based attendance tracking (ported from mededprep-ce).

## Wave Plan

- **Wave 1:** Tasks 1, 2 (parallel — no shared files)
- **Wave 2:** Task 3 (question bank full stack)
- **Wave 3:** Tasks 4, 5 (parallel — no shared files)

## Integration Checks (after each wave)

```bash
cd app && npx tsc --noEmit && npx vite build
npm run lint
```

---

### Task 1: Schema — Question Bank + Attendance Models

- **Agent:** Codex
- **Branch:** task-1-batch2-schema
- **Depends on:** nothing
- **Files to modify:** `prisma/schema.prisma`

#### Prompt

```
Context: MedEdPrep Instructor Tools — Prisma 5, PostgreSQL.

Problem: Two new features need schema support: a question bank for reusable questions, and standalone attendance tracking.

Current State: See `prisma/schema.prisma`. The Organization model has relations to users, students, assessments, bugReports. The Student model has id, orgId, email, firstName, lastName, password, isActive. There is an AssessmentStatus enum (draft, active, closed).

Changes Required:

1. Add QuestionBank model:
   model QuestionBank {
     id          String   @id @default(uuid())
     orgId       String
     createdById String
     title       String
     description String?
     subject     String?
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
     org         Organization      @relation(fields: [orgId], references: [id])
     createdBy   OrgUser           @relation("QuestionBankCreator", fields: [createdById], references: [id])
     items       QuestionBankItem[]
     @@index([orgId])
   }

2. Add QuestionBankItem model:
   model QuestionBankItem {
     id           String    @id @default(uuid())
     bankId       String
     questionData Json
     tags         String[]  @default([])
     usageCount   Int       @default(0)
     lastUsedAt   DateTime?
     createdAt    DateTime  @default(now())
     updatedAt    DateTime  @updatedAt
     bank         QuestionBank @relation(fields: [bankId], references: [id], onDelete: Cascade)
     @@index([bankId])
   }

3. Add AttendanceStatus enum:
   enum AttendanceStatus {
     registered
     checked_in
     attended
     no_show
     cancelled
   }

4. Add Session model:
   model Session {
     id            String    @id @default(uuid())
     orgId         String
     createdById   String
     name          String
     description   String?
     publicHash    String    @unique @default(uuid())
     isPublished   Boolean   @default(false)
     startDateTime DateTime?
     endDateTime   DateTime?
     createdAt     DateTime  @default(now())
     updatedAt     DateTime  @updatedAt
     org           Organization     @relation(fields: [orgId], references: [id])
     createdBy     OrgUser          @relation("SessionCreator", fields: [createdById], references: [id])
     attendees     SessionAttendee[]
     @@index([orgId])
     @@index([publicHash])
   }

5. Add SessionAttendee model:
   model SessionAttendee {
     id           String           @id @default(uuid())
     sessionId    String
     studentId    String
     status       AttendanceStatus @default(registered)
     checkedInAt  DateTime?
     checkedOutAt DateTime?
     notes        String?
     createdAt    DateTime         @default(now())
     updatedAt    DateTime         @updatedAt
     session      Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
     student      Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
     @@unique([sessionId, studentId])
   }

6. Add relations to existing models:
   - Organization: add `questionBanks QuestionBank[]` and `sessions Session[]`
   - OrgUser: add `questionBanks QuestionBank[] @relation("QuestionBankCreator")` and `sessions Session[] @relation("SessionCreator")`
   - Student: add `attendances SessionAttendee[]`

What NOT to Do:
- Do not modify Assessment, AssessmentResponse, or BugReport models
- Do not add seed data
- Do not add any route files

Acceptance Criteria:
- [ ] QuestionBank and QuestionBankItem models exist with all fields
- [ ] Session and SessionAttendee models exist with all fields
- [ ] AttendanceStatus enum exists
- [ ] All relations added to Organization, OrgUser, Student
- [ ] Schema validates

Verification:
npx prisma validate
npx prisma db push
```

---

### Task 2: Live Results Polling

- **Agent:** Codex
- **Branch:** task-2-live-results
- **Depends on:** nothing
- **Files to modify:** `app/src/hooks/useAssessments.ts`, `app/src/pages/admin/AssessmentDetail.tsx`

#### Prompt

```
Context: MedEdPrep Instructor Tools — React 19, TanStack Query v5, shadcn/ui. Brand color: #1b5fd0.

Problem: Instructors want to watch student responses come in while an assessment is active. Currently the responses and item analysis tabs only show data at page load — no auto-refresh.

Current State:
- `app/src/hooks/useAssessments.ts`:
  - `useAssessmentResponses(id, page, limit)` — standard useQuery, no refetchInterval
  - `useItemAnalysis(id)` — standard useQuery, no refetchInterval
- `app/src/pages/admin/AssessmentDetail.tsx`:
  - Calls `useAssessmentResponses(id, responsesPage, responsesLimit)` and `useItemAnalysis(hasResponses ? id : '')`
  - Has assessment object with `assessment.status` available
  - Tabs: overview, qr (active only), responses, analysis

Changes Required:

1. **Add refetchInterval parameter** to `useAssessmentResponses` and `useItemAnalysis` in `useAssessments.ts`:
   - Add an optional `refetchInterval` parameter to each hook
   - Pass it through to the useQuery options
   - Example: `export function useAssessmentResponses(id: string, page = 1, limit = 10, refetchInterval?: number)`

2. **Pass refetchInterval from AssessmentDetail.tsx**:
   - When `assessment.status === 'active'`, pass `refetchInterval: 10000` (10 seconds) to both hooks
   - When not active, pass `undefined` (no polling)

3. **Add a "Live" indicator** on the AssessmentDetail page:
   - When the assessment is active, show a small pulsing green dot with "Live" text next to the assessment title
   - Use: `<span className="inline-flex items-center gap-1.5 text-sm text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />Live</span>`
   - Only show when status is 'active'

What NOT to Do:
- Do not add WebSocket support — polling is sufficient for this scale
- Do not change the hook return types or query keys
- Do not modify ResponsesTab or ItemAnalysisTab components
- Do not add a manual toggle — just auto-poll when active

Acceptance Criteria:
- [ ] Responses tab auto-refreshes every 10 seconds when assessment is active
- [ ] Item analysis tab auto-refreshes every 10 seconds when assessment is active
- [ ] No polling when assessment is draft or closed
- [ ] "Live" indicator visible next to title for active assessments
- [ ] `cd app && npx tsc --noEmit` passes

Verification:
cd app && npx tsc --noEmit
cd app && npx vite build
```

---

### Task 3: Question Bank — Full Stack

- **Agent:** Claude Sonnet
- **Branch:** task-3-question-bank
- **Depends on:** Task 1 (schema)
- **Files to modify:** `routes/question-banks.ts` (new), `app.ts`, `app/src/hooks/useQuestionBanks.ts` (new), `app/src/types/api.ts`, `app/src/pages/admin/QuestionBankList.tsx` (new), `app/src/pages/admin/QuestionBankDetail.tsx` (new), `app/src/components/AdminLayout.tsx`, `app/src/App.tsx`, `app/src/pages/admin/AssessmentCreate.tsx`

#### Prompt

```
Context: MedEdPrep Instructor Tools — Express 5, Prisma 5, React 19, shadcn/ui, TanStack Query v5, Tailwind. Brand color: #1b5fd0. The QuestionBank and QuestionBankItem models already exist in Prisma (from Task 1). QuestionBankItem has a `questionData` Json field storing a SurveyJS `SurveyElement` object (type, name, title, choices, correctAnswer, metadata).

Problem: Instructors rebuild questions from scratch for every assessment. A question bank allows them to store reusable questions and pull them into new assessments.

Current State:
- `app.ts` — Routes mounted with middleware. Pattern: `app.use('/api/assessments', generalLimiter, requireAuth, assessmentRoutes);`
- `routes/assessments.ts` — Good pattern to follow for CRUD routes. Uses Zod validation, `findAssessmentOrThrow` helper, `param()` helper, pagination schema.
- `lib/services/csv-import.ts` — Parses CSV into SurveyJS JSON. Returns `{ surveyJson, questionCount }`. The parsing logic extracts individual `SurveyElement` objects which is exactly what QuestionBankItem.questionData stores.
- `app/src/components/AdminLayout.tsx` — Has NavLink tabs for Dashboard, Assessments, Bug Reports.
- `app/src/App.tsx` — Admin routes nested under `<Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>`.
- `app/src/pages/admin/AssessmentCreate.tsx` — Two tabs: Builder (SurveyJS editor) and CSV import. Form state has title, description, settings. `createPayload()` assembles the POST body.
- `app/src/types/api.ts` — Has SurveyElement, QuestionMetadata, SurveyChoice types already defined.

Changes Required:

**Backend:**

1. **Question bank routes** — `routes/question-banks.ts`:
   - GET `/` — List banks for org. Return: `{ id, title, description, subject, _count: { items } }`
   - POST `/` — Create bank. Schema: `{ title: string, description?: string, subject?: string }`
   - GET `/:id` — Get bank with items. Return bank + paginated items
   - PUT `/:id` — Update bank metadata
   - DELETE `/:id` — Delete bank (cascades to items)
   - POST `/:id/items` — Add question to bank. Schema: `{ questionData: SurveyElement JSON }`
   - PUT `/:id/items/:itemId` — Update question
   - DELETE `/:id/items/:itemId` — Remove question
   - POST `/:id/import-csv` — Import CSV directly into bank. Reuse `parseCsvToSurveyJson` from `lib/services/csv-import.ts`, then extract individual elements and create QuestionBankItem records for each.
   - All endpoints scoped to orgId, require auth

2. **Mount routes** in `app.ts`:
   - `app.use('/api/question-banks', generalLimiter, requireAuth, questionBankRoutes);`

**Frontend:**

3. **Types** in `app/src/types/api.ts`:
   - `QuestionBank` interface: `{ id, title, description?, subject?, createdAt, _count?: { items: number } }`
   - `QuestionBankItem` interface: `{ id, bankId, questionData: SurveyElement, tags: string[], usageCount, lastUsedAt?, createdAt }`

4. **Hooks** — `app/src/hooks/useQuestionBanks.ts`:
   - `useQuestionBanks()` — list all banks
   - `useQuestionBank(id)` — get bank with items
   - `useCreateQuestionBank()` — create bank
   - `useUpdateQuestionBank()` — update bank
   - `useDeleteQuestionBank()` — delete bank
   - `useAddBankItem()` — add question to bank
   - `useUpdateBankItem()` — update question
   - `useDeleteBankItem()` — delete question
   - `useImportCsvToBank()` — import CSV into bank
   - Follow exact patterns from `useAssessments.ts`

5. **QuestionBankList page** — `app/src/pages/admin/QuestionBankList.tsx`:
   - Follow the AssessmentList.tsx pattern
   - Table: Title, Subject, Questions (count), Created
   - "New Bank" button (brand color)
   - Click row → navigate to detail

6. **QuestionBankDetail page** — `app/src/pages/admin/QuestionBankDetail.tsx`:
   - Bank metadata header (title, subject, description) with edit capability
   - Questions list showing: question title, type (radiogroup/checkbox), number of choices, difficulty from metadata
   - "Add Question" button → opens a dialog with a simple form (question text, type, choices, correct answer, metadata fields)
   - CSV import tab/button — reuses the CSV paste pattern from AssessmentCreate
   - Each question row has edit/delete actions
   - Expandable preview showing full question with choices

7. **Admin nav tab** in `AdminLayout.tsx`:
   - Add "Question Bank" NavLink (to "/question-banks") following the existing pattern

8. **Admin routes** in `App.tsx`:
   - Add `<Route path="question-banks" element={<QuestionBankList />} />`
   - Add `<Route path="question-banks/:id" element={<QuestionBankDetail />} />`

9. **Question picker in AssessmentCreate.tsx**:
   - Add a third tab alongside "Builder" and "CSV": "From Bank"
   - This tab shows a dropdown to select a bank, then lists its questions with checkboxes
   - "Add Selected" button takes checked questions, composes them into SurveyJS JSON pages, and sets the surveyJson state
   - Each question shows title, type, difficulty badge
   - When questions are added from the bank, increment their `usageCount` (fire-and-forget PATCH, don't block)

What NOT to Do:
- Do not modify the SurveyJS editor component itself
- Do not add sharing/permissions between orgs (future feature)
- Do not add tagging UI (future feature — tags field exists but UI deferred)
- Do not modify existing assessment routes or models

Acceptance Criteria:
- [ ] CRUD routes for question banks and items work
- [ ] CSV import into bank creates individual QuestionBankItem records
- [ ] Admin can browse, create, edit, delete banks and questions
- [ ] "Question Bank" tab visible in admin nav
- [ ] "From Bank" tab in assessment create lets instructor select questions
- [ ] Selected questions correctly compose into SurveyJS JSON
- [ ] `cd app && npx tsc --noEmit` passes
- [ ] `npm run lint` passes

Verification:
cd app && npx tsc --noEmit
npm run lint
cd app && npx vite build
```

---

### Task 4: Attendance — Full Stack (Copy from mededprep-ce)

- **Agent:** Claude Sonnet
- **Branch:** task-4-attendance
- **Depends on:** Task 1 (schema), Task 3 (for AdminLayout.tsx and App.tsx state after question bank routes are added)
- **Files to modify:** `routes/sessions.ts` (new), `routes/public-attendance.ts` (new), `app.ts`, `app/src/hooks/useAttendance.ts` (new), `app/src/hooks/usePublicAttendance.ts` (new), `app/src/types/api.ts`, `app/src/pages/admin/SessionList.tsx` (new), `app/src/pages/admin/SessionDetail.tsx` (new), `app/src/pages/admin/session-detail/AttendeeSection.tsx` (new), `app/src/pages/admin/session-detail/QrCodeSection.tsx` (new), `app/src/pages/public/AttendSession.tsx` (new), `app/src/pages/public/CheckOutSession.tsx` (new), `app/src/components/AdminLayout.tsx`, `app/src/App.tsx`

#### Prompt

```
Context: MedEdPrep Instructor Tools — Express 5, Prisma 5, React 19, shadcn/ui, TanStack Query v5, Tailwind. Brand color: #1b5fd0. The Session, SessionAttendee, and AttendanceStatus models already exist in Prisma (from Task 1). This feature is ported from mededprep-ce which has a nearly identical attendance system — use those files as your starting point.

Problem: Instructors need standalone attendance tracking with QR-based check-in/check-out, independent of assessments.

IMPORTANT: Copy from mededprep-ce and adapt. The sibling project has working attendance code. Reference these files directly:

**Backend files to copy from:**
- `../../mededprep-ce/routes/public.js` lines 25-317 — Public attendance endpoints (register, lookup, checkout). Strip survey references. Convert JS→TS.
- `../../mededprep-ce/routes/classes.js` lines 513-693 — Admin attendee management (list, add, update status, manual check-in/out, QR generation). Strip certificate logic. Convert JS→TS.

**Frontend files to copy from:**
- `../../mededprep-ce/app/src/pages/public/AttendClass.tsx` (382 lines) — Multi-step check-in wizard. Strip survey redirect logic from "done" step. Otherwise copy verbatim.
- `../../mededprep-ce/app/src/pages/public/CheckOutClass.tsx` (181 lines) — Check-out page. Copy verbatim, no CE-specific code.
- `../../mededprep-ce/app/src/pages/admin/class-detail/AttendeeSection.tsx` (247 lines) — Admin attendee table with stats. Copy verbatim, no CE-specific code.
- `../../mededprep-ce/app/src/pages/admin/class-detail/QrCodeSection.tsx` (137 lines) — Dual QR code display (check-in + checkout). Copy verbatim.
- `../../mededprep-ce/app/src/hooks/usePublic.ts` lines 13-64 — Public attendance hooks. Copy, skip survey hooks.
- `../../mededprep-ce/app/src/hooks/useClasses.ts` lines 202-279 — Admin attendee mutation hooks. Copy verbatim.

**Adaptations needed when copying:**
- Model names: `Class` → `Session`, `ClassAttendee` → `SessionAttendee`, `classId` → `sessionId`
- Route paths: `/attend/:hash` stays the same
- API paths: `/api/classes/:id/attendees` → `/api/sessions/:id/attendees`
- Port: 2000 → 9000 (dev mode QR URLs)
- JS → TypeScript: Add type annotations, use Zod validation
- Remove all survey and certificate references
- Import paths: Update to mededprep-inst's lib/prisma, lib/errors, lib/validate

Changes Required:

**Backend:**

1. **Session CRUD routes** — `routes/sessions.ts`:
   - GET `/` — List sessions with attendee counts
   - POST `/` — Create session. Schema: `{ name, description?, startDateTime?, endDateTime? }`
   - GET `/:id` — Get session with attendee list
   - PUT `/:id` — Update session
   - DELETE `/:id` — Delete session (cascade deletes attendees)
   - POST `/:id/publish` — Set isPublished=true (enables QR/check-in)
   - GET `/:id/attendees` — List attendees (copy from mededprep-ce)
   - POST `/:id/attendees` — Add attendee manually (copy from mededprep-ce)
   - PUT `/:id/attendees/:aid` — Update attendee status/notes (copy from mededprep-ce)
   - POST `/:id/attendees/:aid/check-in` — Manual check-in (copy from mededprep-ce)
   - POST `/:id/attendees/:aid/check-out` — Manual check-out (copy from mededprep-ce)
   - GET `/:id/qr-codes` — Generate check-in + checkout QR codes (copy pattern from mededprep-ce, update port to 9000)
   - All endpoints scoped to orgId, require auth

2. **Public attendance routes** — `routes/public-attendance.ts`:
   - GET `/attend/:hash` — Get session info + check-in window status (copy from mededprep-ce, strip surveys)
   - POST `/attend/:hash/register` — Register + auto check-in (copy, strip surveys from response)
   - POST `/attend/:hash/lookup` — Returning student email lookup (copy verbatim)
   - POST `/attend/:hash/checkout` — Self-service checkout (copy verbatim)
   - Include the `getAttendanceWindow()` helper from mededprep-ce

3. **Mount routes** in `app.ts`:
   - `app.use('/api/sessions', generalLimiter, requireAuth, sessionRoutes);`
   - `app.use('/api/public', generalLimiter, publicAttendanceRoutes);` — add to existing public route mounting area

**Frontend:**

4. **Types** in `app/src/types/api.ts`:
   - `Session` interface: `{ id, name, description?, publicHash, isPublished, startDateTime?, endDateTime?, createdAt, _count?: { attendees } }`
   - `SessionAttendee` interface: `{ id, sessionId, studentId, status: AttendanceStatus, checkedInAt?, checkedOutAt?, notes?, student?: { firstName, lastName, email } }`
   - `AttendanceStatus` type: `'registered' | 'checked_in' | 'attended' | 'no_show' | 'cancelled'`

5. **Admin hooks** — `app/src/hooks/useAttendance.ts`:
   - Copy attendee hooks from mededprep-ce's useClasses.ts lines 202-279, rename class→session
   - Add: `useSessions()`, `useSession(id)`, `useCreateSession()`, `useUpdateSession()`, `useDeleteSession()`, `usePublishSession()`

6. **Public hooks** — `app/src/hooks/usePublicAttendance.ts`:
   - Copy from mededprep-ce's usePublic.ts lines 13-64, rename class→session
   - `useSessionInfo(hash)`, `useRegisterAttendee(hash)`, `useLookupStudent(hash)`, `useCheckOutSelf(hash)`

7. **Admin pages**:
   - `SessionList.tsx` — Follow AssessmentList.tsx pattern. Table: Name, Status (Published/Draft), Attendees, Date
   - `SessionDetail.tsx` — Tabs: Overview, Attendance, QR Codes. Follow AssessmentDetail.tsx pattern
   - `session-detail/AttendeeSection.tsx` — Copy from mededprep-ce, rename class→session
   - `session-detail/QrCodeSection.tsx` — Copy from mededprep-ce, rename class→session

8. **Public pages**:
   - `AttendSession.tsx` — Copy from mededprep-ce's AttendClass.tsx, strip survey redirect, rename class→session
   - `CheckOutSession.tsx` — Copy from mededprep-ce's CheckOutClass.tsx, rename class→session

9. **Admin nav** in `AdminLayout.tsx`:
   - Add "Attendance" NavLink (to "/sessions")

10. **Routes** in `App.tsx`:
    - Admin: `<Route path="sessions" element={<SessionList />} />`, `<Route path="sessions/:id" element={<SessionDetail />} />`
    - Public: `<Route path="/attend/:hash" element={<AttendSession />} />`, `<Route path="/attend/:hash/checkout" element={<CheckOutSession />} />`

What NOT to Do:
- Do not implement certificates or surveys
- Do not add time-window enforcement on the backend (copy it from mededprep-ce as-is, but don't add new logic beyond what CE has)
- Do not modify assessment routes or the existing public quiz-taking flow
- Do not add attendance export/reports (future feature)

Acceptance Criteria:
- [ ] Session CRUD works (create, list, update, delete, publish)
- [ ] QR codes generated for check-in and checkout
- [ ] Public check-in flow works: scan QR → enter info → checked in
- [ ] Public checkout flow works: scan QR → enter email → checked out
- [ ] Admin can view attendee list, manually check in/out, update status
- [ ] "Attendance" tab in admin nav
- [ ] `cd app && npx tsc --noEmit` passes
- [ ] `npm run lint` passes

Verification:
cd app && npx tsc --noEmit
npm run lint
cd app && npx vite build
```

---

### Task 5: Assessment Create — Question Bank Picker Enhancement

- **Agent:** Gemini
- **Branch:** task-5-question-picker-polish
- **Depends on:** Task 3 (question bank routes and types must exist)
- **Files to modify:** `app/src/pages/admin/AssessmentCreate.tsx`

#### Prompt

```
Context: MedEdPrep Instructor Tools — React 19, shadcn/ui, TanStack Query v5, Tailwind. Brand color: #1b5fd0. The question bank feature is already built (Task 3) with routes, hooks, and types. The assessment create page already has a "From Bank" tab added by Task 3.

Problem: The "From Bank" tab in AssessmentCreate needs polish — preview of selected questions before adding, question count summary, and ability to deselect.

Current State: After Task 3, `app/src/pages/admin/AssessmentCreate.tsx` has three tabs: Builder, CSV, and "From Bank". The "From Bank" tab has a bank selector dropdown and question checkboxes. But it may need UX refinement.

Changes Required:

1. **Selected questions preview panel**:
   - Below the question list, show a "Selected Questions (N)" summary
   - List selected question titles in a compact format with X buttons to remove individual selections
   - Show total count prominently

2. **Question preview expansion**:
   - Each question in the list should be expandable (click to expand)
   - Expanded view shows: full question text, all choices with correct answer highlighted in green, metadata (chapter, difficulty, explanation)

3. **Bulk actions**:
   - "Select All" / "Deselect All" buttons
   - "Add N Questions to Assessment" button disabled when nothing selected

4. **Question count validation**:
   - After adding questions from bank, show a toast with "Added N questions to assessment"
   - If questions were already in the builder (from SurveyJS editor), warn: "This will replace existing questions. Continue?"

What NOT to Do:
- Do not modify the question bank routes or hooks
- Do not change the Builder or CSV tabs
- Do not add drag-and-drop reordering (future feature)
- Do not modify the SurveyEditor component

Acceptance Criteria:
- [ ] Selected questions shown in preview panel with remove buttons
- [ ] Questions expandable to show full details
- [ ] Select all / deselect all works
- [ ] Replacement warning when builder already has questions
- [ ] `cd app && npx tsc --noEmit` passes

Verification:
cd app && npx tsc --noEmit
cd app && npx vite build
```

---

## Dispatch

Run the setup script to create worktrees:

```bash
../workflow/setup-worktrees.sh all
```

Or by wave:

```bash
../workflow/setup-worktrees.sh 1,2     # Wave 1
../workflow/setup-worktrees.sh 3       # Wave 2
../workflow/setup-worktrees.sh 4,5     # Wave 3
```

## Merge Order

1. Merge Wave 1 (Tasks 1, 2) into main — no shared files, clean merges
2. Merge Wave 2 (Task 3) — touches app.ts, AdminLayout, App.tsx
3. Merge Wave 3 (Tasks 4, 5) — Task 4 touches app.ts/AdminLayout (merge after Task 3); Task 5 only touches AssessmentCreate (merge anytime after Task 3)
