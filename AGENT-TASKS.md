# Agent Tasks — Beta Launch Prep (Batch 1)

## Overview

Prepares MedEdPrep Instructor Tools for a 25-student demo launch: fixes the name bug, adds persistent admin navigation, redesigns the student quiz flow with a proper landing page and post-quiz account creation, adds close confirmation + reactivate, individual response viewing, item analysis polish, and an in-app bug reporting pipeline.

## Wave Plan

- **Wave 1:** Tasks 1, 2, 3, 4 (parallel — no shared files)
- **Wave 2:** Tasks 5, 6, 7 (parallel — depends on Wave 1)
- **Wave 3:** Task 8 (depends on Wave 2)

## Integration Checks (after each wave)

```bash
cd app && npx tsc --noEmit && npx vite build
npm run lint
```

---

### Task 1: Prisma Schema — Add allowStudentReview + BugReport Model

- **Agent:** Codex
- **Branch:** task-1-schema-changes
- **Depends on:** nothing
- **Files to modify:** `prisma/schema.prisma`

#### Prompt

```
Context: MedEdPrep Instructor Tools — Express 5, Prisma 5, PostgreSQL.

Problem: Two new features need schema support: (1) instructors need a toggle to control whether students can review quiz answers/explanations after completing an assessment, (2) an in-app bug reporting system needs a BugReport model.

Current State: See `prisma/schema.prisma`. The Assessment model has boolean fields like `showScoreFeedback`, `resultsReleased`, `randomizeQuestions`, `randomizeChoices`. The Organization model has relations to `users`, `students`, `assessments`.

Changes Required:

1. Add `allowStudentReview Boolean @default(false)` to the Assessment model, placed after `showScoreFeedback`.

2. Add a new BugReport model:

   model BugReport {
     id               String   @id @default(uuid())
     orgId            String
     reporterType     String   // 'admin' | 'student' | 'anonymous'
     reporterId       String?
     reporterEmail    String?
     reporterName     String?
     category         String   // 'bug' | 'feedback' | 'feature_request'
     severity         String   @default("medium")
     description      String
     stepsToReproduce String?
     url              String?
     userAgent        String?
     viewport         String?
     errorMessage     String?
     errorStack       String?
     screenshotUrl    String?
     status           String   @default("open")
     createdAt        DateTime @default(now())
     updatedAt        DateTime @updatedAt
     org              Organization @relation(fields: [orgId], references: [id])
     @@index([orgId])
     @@index([status])
     @@index([createdAt])
   }

3. Add `bugReports BugReport[]` to the Organization model's relations.

What NOT to Do:
- Do not add a githubIssueUrl field (deferred to Phase 2)
- Do not add any seed data
- Do not modify any other models

Acceptance Criteria:
- [ ] Assessment model has `allowStudentReview Boolean @default(false)`
- [ ] BugReport model exists with all fields listed above
- [ ] Organization model has `bugReports BugReport[]` relation
- [ ] Schema is valid

Verification:
npx prisma validate
npx prisma db push
```

---

### Task 2: Admin Layout with Persistent Navigation

- **Agent:** Claude Sonnet
- **Branch:** task-2-admin-layout
- **Depends on:** nothing
- **Files to modify:** `app/src/components/AdminLayout.tsx` (new), `app/src/App.tsx`, `app/src/pages/Dashboard.tsx`, `app/src/pages/admin/AssessmentList.tsx`, `app/src/pages/admin/AssessmentCreate.tsx`, `app/src/pages/admin/AssessmentDetail.tsx`

#### Prompt

```
Context: MedEdPrep Instructor Tools — React 19, React Router, shadcn/ui, Tailwind. Brand color: #1b5fd0.

Problem: There is no shared layout for admin pages. Each page renders its own header with brand name, user email, and sign-out button. There's no way to navigate between pages without the browser back button. This needs a persistent top navigation bar.

Current State:
- `app/src/App.tsx` — Each admin route individually wraps its component with `<ProtectedRoute>`. ProtectedRoute is defined inline (lines 16-20) using `useIsAuthenticated()`. There is also a `StudentProtectedRoute` (lines 22-26).
- `app/src/pages/Dashboard.tsx` — Has its own `<header>` block with brand "MedEdPrep", user email, and sign out button. Outer wrapper: `<div className="min-h-screen bg-gray-50">`.
- `app/src/pages/admin/AssessmentList.tsx` — Outer wrapper: `<div className="min-h-screen bg-gray-50">` with `<main>` inside.
- `app/src/pages/admin/AssessmentCreate.tsx` — Same `min-h-screen bg-gray-50` pattern.
- `app/src/pages/admin/AssessmentDetail.tsx` — Same pattern. Has its own page title area.

Changes Required:

1. Create `app/src/components/AdminLayout.tsx`:
   - Import `Outlet` from react-router-dom, `useAuthStore` from `@/lib/auth`, `NavLink` from react-router-dom
   - Sticky header with: "MedEdPrep" brand text (left), user email + "Sign Out" button (right)
   - Below header: horizontal tab nav with NavLink items — "Dashboard" (to "/") and "Assessments" (to "/assessments")
   - Use NavLink's active state for styling: active tab gets brand color text + bottom border, inactive gets muted text
   - Below nav: `<main className="mx-auto max-w-7xl px-6 py-8"><Outlet /></main>`
   - The layout provides `min-h-screen bg-gray-50` — child pages should NOT provide it

2. Restructure `app/src/App.tsx`:
   - Keep ProtectedRoute and StudentProtectedRoute inline definitions
   - Wrap admin routes in a layout route: `<Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>`
   - Child routes: `<Route index element={<Dashboard />} />`, `<Route path="assessments" element={<AssessmentList />} />`, etc.
   - `/login` stays outside the layout
   - Public and student routes stay unchanged
   - QrPresenter (`/assessments/:id/present`) should also be inside the layout

3. Strip standalone wrappers from admin pages:
   - Dashboard.tsx: Remove the `<header>` block, remove the outer `<div className="min-h-screen bg-gray-50">` wrapper, remove the `<main>` wrapper. The component should just return its content cards.
   - AssessmentList.tsx: Remove outer `min-h-screen bg-gray-50` div and `<main>` wrapper.
   - AssessmentCreate.tsx: Same — remove outer wrappers.
   - AssessmentDetail.tsx: Same — remove outer wrappers.

What NOT to Do:
- Do not add a sidebar — this is a horizontal top nav only
- Do not modify student routes or public routes
- Do not add dropdown menus or user profile pages
- Do not touch any tab content components (OverviewTab, ResponsesTab, etc.)

Acceptance Criteria:
- [ ] AdminLayout renders header with brand, user email, sign out
- [ ] Tab nav shows "Dashboard" and "Assessments" with active state styling
- [ ] All admin pages render inside the layout with persistent nav
- [ ] No admin page has its own header/sign-out/bg-gray-50 wrapper anymore
- [ ] Login page is NOT inside the layout
- [ ] Student and public routes are unaffected
- [ ] `cd app && npx tsc --noEmit` passes

Verification:
cd app && npx tsc --noEmit
cd app && npx vite build
```

---

### Task 3: Student Flow Redesign — Landing Page + Post-Quiz Account Creation

- **Agent:** Claude Sonnet
- **Branch:** task-3-student-flow
- **Depends on:** nothing
- **Files to modify:** `app/src/pages/public/take-assessment/StudentInfoStep.tsx`, `app/src/pages/public/TakeAssessment.tsx`, `app/src/pages/public/take-assessment/AssessmentResults.tsx`, `routes/public.ts`, `app/src/hooks/usePublic.ts`, `app/src/types/api.ts`

#### Prompt

```
Context: MedEdPrep Instructor Tools — React 19, Express 5, shadcn/ui, Tailwind. Brand color: #1b5fd0.

Problem: Students scan a QR code and land on a bare form with a single "Student Name" field. If they enter only a first name (e.g., "John"), account creation fails later because the backend register schema requires lastName min(1). Additionally, the landing page shows no assessment context (title, question count, time limit), and the post-quiz flow doesn't encourage account creation effectively.

Current State:
- `app/src/pages/public/TakeAssessment.tsx` — Manages `studentName` (single string) and `studentEmail` state. Passes both to StudentInfoStep and AssessmentResults. The `handleStart` function calls `startAssessment.mutateAsync({ studentName, studentEmail })`.
- `app/src/pages/public/take-assessment/StudentInfoStep.tsx` — Has a single "Student Name" input and an email input. Shows questionCount and timeLimitMinutes in an info grid.
- `app/src/pages/public/take-assessment/AssessmentResults.tsx` — Has a `splitName()` helper that splits a full name string. Uses it in `handleCreateAccount` to get firstName/lastName for registration. Shows score + password form for account creation.
- `routes/public.ts` — `startAssessmentSchema` expects `{ studentName, studentEmail }`. Has a `parseStudentName()` helper that splits on whitespace. The start endpoint upserts a Student record.
- `app/src/hooks/usePublic.ts` — `useStartAssessment` sends `{ studentName: string; studentEmail: string }`.
- `app/src/types/api.ts` — `PublicAssessmentInfo` has `id, title, description, questionCount, timeLimitMinutes`.

Changes Required:

1. **StudentInfoStep.tsx** — Redesign as a landing page:
   - Show assessment title prominently at top (add `title` and `description` props)
   - Info summary: question count, time limit (or "No time limit"), and description if present
   - Replace single name field with two fields in a grid row: "First Name" and "Last Name" (both required)
   - Keep email field below the name row
   - Update props: remove `studentName`/`onNameChange`, add `firstName`/`onFirstNameChange`/`lastName`/`onLastNameChange`, add `title`/`description`
   - "Begin Assessment" button (brand color) instead of current submit button text

2. **TakeAssessment.tsx** — Update state management:
   - Replace `studentName` state with `firstName` and `lastName` states
   - Update `handleStart` to call `startAssessment.mutateAsync({ firstName, lastName, studentEmail })`
   - Pass `firstName`, `lastName` (and `title`, `description` from assessment data) to StudentInfoStep
   - Pass `firstName`, `lastName`, `studentEmail` to AssessmentResults (instead of `studentName`)

3. **AssessmentResults.tsx** — Redesign post-quiz account creation:
   - Remove `splitName()` helper entirely
   - Accept `firstName` and `lastName` props instead of `studentName`
   - Auto-fill first name, last name, and email in the account creation section (show them as read-only or pre-filled)
   - Change the messaging: "Create your account to review your answers and track your progress"
   - In `handleCreateAccount`, pass firstName/lastName directly to `registerStudent.mutateAsync()` (no splitting)
   - Keep the skip option

4. **routes/public.ts** — Update backend:
   - Change `startAssessmentSchema` to `{ firstName: z.string().trim().min(1), lastName: z.string().trim().min(1), studentEmail: z.string().email() }`
   - Remove the `parseStudentName()` helper function
   - In the start endpoint, use firstName/lastName directly for Student upsert
   - Construct display name as `${firstName} ${lastName}` for the AssessmentResponse `studentName` field

5. **usePublic.ts** — Update mutation type:
   - Change `useStartAssessment` input to `{ firstName: string; lastName: string; studentEmail: string }`

6. **types/api.ts** — Add `title` to props if not already available from the query (it should be — `PublicAssessmentInfo` already has `title` and `description`).

What NOT to Do:
- Do not implement the `allowStudentReview` toggle or review gating yet (that's a separate task)
- Do not change the quiz-taking step (QuestionCard, timer, etc.)
- Do not modify the submit endpoint
- Do not touch student-auth routes
- Do not add any new packages

Acceptance Criteria:
- [ ] Landing page shows assessment title, description, question count, time limit
- [ ] Two separate name fields: First Name and Last Name (both required)
- [ ] Backend accepts firstName/lastName directly, no name parsing
- [ ] "John" as first name + "Doe" as last name → account creation succeeds
- [ ] Post-quiz results show name/email pre-filled in account creation section
- [ ] splitName() and parseStudentName() are removed
- [ ] `cd app && npx tsc --noEmit` passes

Verification:
cd app && npx tsc --noEmit
npm run lint
cd app && npx vite build
```

---

### Task 4: Item Analysis Readability Improvements

- **Agent:** Gemini
- **Branch:** task-4-item-analysis-styling
- **Depends on:** nothing
- **Files to modify:** `app/src/pages/admin/assessment-detail/ItemAnalysisTab.tsx`

#### Prompt

```
Context: MedEdPrep Instructor Tools — React, shadcn/ui, Tailwind CSS.

Problem: The item analysis tab needs better visual distinction between correct and incorrect answers, and the % correct column needs color-coding for quick scanning.

Current State: See `app/src/pages/admin/assessment-detail/ItemAnalysisTab.tsx`.
- Correct answer rows have `border-emerald-300 bg-emerald-50` with a CheckCircle2 icon
- Incorrect answer rows have no explicit styling (just the default div background)
- Progress bars: correct = `bg-emerald-600`, incorrect = `bg-[#1b5fd0]` (brand blue) — no clear visual distinction
- Expanded question detail is rendered without a card wrapper

Changes Required:

1. **Incorrect answer rows**: Add explicit styling — white background, gray border: `border-gray-200 bg-white`
2. **Progress bars**: Change incorrect answers from brand blue to gray: `bg-gray-300` (keep correct as `bg-emerald-600`)
3. **Expanded question detail**: Wrap in a Card component (import from `@/components/ui/card`) with white background and shadow instead of bare div
4. **% Correct column in the summary table**: Color-code the percentage text:
   - >= 70%: `text-emerald-700`
   - 50-69%: `text-amber-600`
   - < 50%: `text-red-600`

What NOT to Do:
- Do not restructure the component or change its props
- Do not modify the point-biserial calculation or `pbsClass` utility
- Do not add new data fetching or API calls
- Do not change the table column structure

Acceptance Criteria:
- [ ] Correct answers: green border + bg + check icon (already present, verify preserved)
- [ ] Incorrect answers: white bg + gray border (explicit, not unstyled)
- [ ] Progress bars: emerald for correct, gray for incorrect
- [ ] Expanded detail wrapped in Card with shadow
- [ ] % Correct column color-coded: green >=70%, amber 50-69%, red <50%
- [ ] `cd app && npx tsc --noEmit` passes

Verification:
cd app && npx tsc --noEmit
cd app && npx vite build
```

---

### Task 5: Close Confirmation + Reactivate + allowStudentReview Toggle

- **Agent:** Claude Sonnet
- **Branch:** task-5-close-reactivate-review-toggle
- **Depends on:** Task 1 (schema)
- **Files to modify:** `app/src/components/ui/alert-dialog.tsx` (new, via shadcn), `app/src/pages/admin/AssessmentDetail.tsx`, `routes/assessments.ts`, `app/src/hooks/useAssessments.ts`, `app/src/pages/admin/AssessmentCreate.tsx`

#### Prompt

```
Context: MedEdPrep Instructor Tools — Express 5, Prisma 5, React 19, shadcn/ui, Tailwind. Brand color: #1b5fd0.

Problem: Three related issues on the assessment detail page: (1) the "Close" button immediately closes the assessment with no confirmation — instructors click it accidentally, (2) there's no way to reactivate a closed assessment, (3) there's no toggle for the new `allowStudentReview` field (already in schema from Task 1).

Current State:
- `app/src/pages/admin/AssessmentDetail.tsx`:
  - `handleClose` calls `closeAssessment.mutateAsync(id)` directly with no confirmation
  - The close button uses `variant="secondary"` and just says "Close"
  - ToggleSwitch components for showScoreFeedback and releaseResults exist
  - No reactivate button exists for closed assessments
- `routes/assessments.ts`:
  - Close endpoint at POST `/:id/close` — transitions any assessment to closed
  - No reactivate endpoint exists
  - `createAssessmentSchema` has boolean fields like `showScoreFeedback` as `z.boolean().optional()`
  - `updateAssessmentSchema = createAssessmentSchema.partial()`
- `app/src/hooks/useAssessments.ts`:
  - `useCloseAssessment` exists. No reactivate hook.
  - `useUpdateAssessment` mutation type includes fields like `showScoreFeedback?: boolean`
- `app/src/components/ui/alert-dialog.tsx` does NOT exist yet
- `app/src/pages/admin/AssessmentCreate.tsx`:
  - Settings section has checkboxes for randomizeQuestions and randomizeChoices
  - FormState type and createPayload() would need the new field

Changes Required:

1. **Add shadcn AlertDialog**: Run `cd app && npx shadcn@latest add alert-dialog` to generate the component. If that doesn't work, create `app/src/components/ui/alert-dialog.tsx` manually following the shadcn AlertDialog pattern (uses @radix-ui/react-alert-dialog which is already installed as a dependency of other shadcn components).

2. **Close confirmation** in AssessmentDetail.tsx:
   - Add AlertDialog state (open/closed)
   - Change the Close button: rename to "Close Assessment", use `variant="destructive"`, and make it open the AlertDialog instead of calling handleClose directly
   - AlertDialog content: title "Close Assessment?", description "Students will no longer be able to submit responses. You can reactivate it later if needed.", Cancel button, and "Close Assessment" confirm button that calls the existing handleClose

3. **Reactivate endpoint** in routes/assessments.ts:
   - Add `POST /:id/reactivate` — only allows transition from `closed` to `active` (not from draft)
   - Follow the exact same pattern as the close endpoint
   - Return 400 if assessment is not in 'closed' status

4. **Reactivate hook** in useAssessments.ts:
   - Add `useReactivateAssessment` following the same pattern as `useCloseAssessment`

5. **Reactivate button** in AssessmentDetail.tsx:
   - When `status === 'closed'`, show a "Reactivate" button (variant="default", brand color bg) that calls the reactivate mutation
   - Place it alongside where the close button would normally be

6. **allowStudentReview toggle** in AssessmentDetail.tsx:
   - Add a ToggleSwitch for "Allow Student Review" following the exact pattern of the showScoreFeedback toggle
   - Place it after the existing toggles
   - Add a handler following the handleScoreFeedbackToggle pattern

7. **allowStudentReview in create flow** in AssessmentCreate.tsx:
   - Add `allowStudentReview: boolean` to FormState (default: false)
   - Add a checkbox in the settings section following the randomizeQuestions pattern
   - Include it in createPayload()

8. **Backend schema update** in routes/assessments.ts:
   - Add `allowStudentReview: z.boolean().optional()` to createAssessmentSchema
   - Add it to the create handler's data spread

9. **Hook type update** in useAssessments.ts:
   - Add `allowStudentReview?: boolean` to useUpdateAssessment's type

What NOT to Do:
- Do not implement the actual student review gating logic (that's separate)
- Do not modify the student-facing routes
- Do not change the OverviewTab or other tab components
- Do not remove or restructure existing toggles

Acceptance Criteria:
- [ ] "Close Assessment" button shows confirmation dialog before closing
- [ ] Reactivate endpoint works (closed → active only, rejects non-closed)
- [ ] Reactivate button visible on closed assessments, works correctly
- [ ] allowStudentReview toggle visible on AssessmentDetail page
- [ ] allowStudentReview checkbox in AssessmentCreate form
- [ ] All type checks pass: `cd app && npx tsc --noEmit`

Verification:
cd app && npx tsc --noEmit
npm run lint
cd app && npx vite build
```

---

### Task 6: View Individual Student Responses

- **Agent:** Claude Sonnet
- **Branch:** task-6-response-detail
- **Depends on:** Task 1 (schema — for allowStudentReview field availability)
- **Files to modify:** `lib/services/quiz-scoring.ts`, `routes/student-auth.ts`, `routes/assessments.ts`, `app/src/types/api.ts`, `app/src/hooks/useAssessments.ts`, `app/src/pages/admin/assessment-detail/ResponseDetailDialog.tsx` (new), `app/src/pages/admin/assessment-detail/ResponsesTab.tsx`

#### Prompt

```
Context: MedEdPrep Instructor Tools — Express 5, Prisma 5, React 19, shadcn/ui, Tailwind.

Problem: Instructors cannot view individual student responses. They can see the summary table (name, score, pass/fail) but can't drill into what a specific student answered for each question.

Current State:
- `routes/student-auth.ts` — Contains local helper functions `normalizeAnswer`, `mapChoice`, and `buildReviewQuestions`. These build a question-by-question breakdown with student answers, correct answers, and correctness. They're used in the student review endpoint.
- `lib/services/quiz-scoring.ts` — Existing service with scoring functions. Good place to extract shared helpers.
- `routes/assessments.ts` — Admin assessment routes. Has GET `/:id/responses` for paginated list but NO endpoint for a single response's detail.
- `app/src/pages/admin/assessment-detail/ResponsesTab.tsx` — Renders a table of responses. Rows are NOT clickable. Shows studentName, email, score, passed, timeTaken, completedAt.
- `app/src/hooks/useAssessments.ts` — Has `useAssessmentResponses` query but no single-response detail query.
- `app/src/types/api.ts` — Has SurveyElement, QuestionMetadata, SurveyChoice types. No ResponseDetail type.

Changes Required:

1. **Extract shared helpers** into `lib/services/quiz-scoring.ts`:
   - Move `normalizeAnswer`, `mapChoice`, and `buildReviewQuestions` from `routes/student-auth.ts` into `lib/services/quiz-scoring.ts`
   - Export them as named exports
   - Also export the `ReviewQuestion` type (currently defined in student-auth.ts)
   - Update `routes/student-auth.ts` to import from the service instead of defining locally

2. **New admin endpoint** in `routes/assessments.ts`:
   - `GET /:id/responses/:responseId` — returns the response record + question-by-question breakdown
   - Fetch the AssessmentResponse (include assessment for surveyJson)
   - Call `buildReviewQuestions(surveyJson, responseData)` to build the breakdown
   - Return: `{ response: { id, studentName, studentEmail, scorePercentage, totalCorrect, totalQuestions, passed, timeTaken, completedAt }, questions: ReviewQuestion[] }`
   - Scoped to orgId (via the assessment's orgId)

3. **Frontend types** in `app/src/types/api.ts`:
   - Add `ReviewQuestion` interface: `{ questionName, questionTitle, choices: {value, text}[], studentAnswer, correctAnswer, isCorrect, explanation, pageNumber }`
   - Add `ResponseDetail` interface: `{ response: {...}, questions: ReviewQuestion[] }`

4. **Query hook** in `app/src/hooks/useAssessments.ts`:
   - Add `useResponseDetail(assessmentId, responseId)` query — enabled only when both IDs are truthy
   - Query key: `['assessments', assessmentId, 'responses', responseId]`

5. **ResponseDetailDialog** — new file `app/src/pages/admin/assessment-detail/ResponseDetailDialog.tsx`:
   - shadcn Dialog showing the response detail
   - Header: student name, email, score summary (X/Y correct, Z%), pass/fail badge
   - Scrollable list of questions, each showing:
     - Question title
     - Student's answer (highlighted red if wrong, green if correct)
     - Correct answer (always shown, green)
     - Explanation and page number from metadata (if present)
   - Follow the Dialog pattern used in `EditAssessmentDialog.tsx` in the same directory

6. **Make rows clickable** in `ResponsesTab.tsx`:
   - Add `selectedResponseId` state
   - Add `onClick` handler to TableRow that sets the selected response
   - Add cursor-pointer styling to rows
   - Render ResponseDetailDialog when a response is selected
   - The dialog needs assessmentId — add it as a prop to ResponsesTab

What NOT to Do:
- Do not modify the student review endpoint's behavior
- Do not add edit/delete capabilities for responses
- Do not change the ResponsesTab table columns or pagination
- Do not add new API routes beyond the single response detail endpoint

Acceptance Criteria:
- [ ] Shared helpers extracted to lib/services/quiz-scoring.ts
- [ ] student-auth.ts imports from shared service (no duplication)
- [ ] GET /:id/responses/:responseId returns response + question breakdown
- [ ] Clicking a response row opens a detail dialog
- [ ] Dialog shows question-by-question breakdown with correct/incorrect highlighting
- [ ] Explanation and page number shown when available
- [ ] `cd app && npx tsc --noEmit` passes

Verification:
cd app && npx tsc --noEmit
npm run lint
cd app && npx vite build
```

---

### Task 7: Bug Report Pipeline — Backend + Frontend

- **Agent:** Claude Sonnet
- **Branch:** task-7-bug-reports
- **Depends on:** Task 1 (schema), Task 2 (admin layout for App.tsx structure)
- **Files to modify:** `middleware/optionalAuth.ts` (new), `routes/bug-reports.ts` (new), `app.ts`, `app/src/components/BugReportButton.tsx` (new), `app/src/components/BugReportDialog.tsx` (new), `app/src/hooks/useBugReports.ts` (new), `app/src/types/api.ts`, `app/src/App.tsx`, `app/src/pages/admin/BugReports.tsx` (new), `lib/imagekit.ts` (new)

#### Prompt

```
Context: MedEdPrep Instructor Tools — Express 5, Prisma 5, React 19, shadcn/ui, Tailwind, TanStack Query. Brand color: #1b5fd0. The BugReport model already exists in Prisma (from Task 1) with fields: id, orgId, reporterType, reporterId, reporterEmail, reporterName, category, severity, description, stepsToReproduce, url, userAgent, viewport, errorMessage, errorStack, screenshotUrl, status, createdAt, updatedAt.

Problem: No mechanism for users to report bugs during a live demo. Need a floating bug report button on every page, a report dialog, backend storage, an admin page to view reports, and screenshot capture via ImageKit.

Current State:
- `app.ts` — Routes mounted around lines 105-122. Middleware order: helmet, cors, json, urlencoded, cookieParser, pinoHttp, then routes. Rate limiters: `submitLimiter` (5/15min), `generalLimiter` (100/min), `authLimiter` (10/15min).
- `middleware/` — Has errorHandler.ts, rate-limiter.ts, tenantResolver.ts. No optional auth middleware.
- `lib/auth.ts` — Has `verifyToken(token)` function used by `requireAuth` middleware.
- `app/src/App.tsx` — After Task 2, this will have an AdminLayout wrapping admin routes. The bug report button needs to render globally (outside all routes).
- ImageKit is used in sibling projects. Pattern from mededprep-clinicals: env vars `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`; package `@imagekit/nodejs`; lazy client init with `isImageKitConfigured()` check.

Changes Required:

**Backend:**

1. **ImageKit service** — `lib/imagekit.ts`:
   - Follow the pattern from `../../mededprep-clinicals/lib/imagekit.js` but in TypeScript
   - Env vars: IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT (all optional)
   - Lazy initialization with `getClient()`, `isImageKitConfigured()` check
   - `uploadImage(buffer: Buffer, fileName: string, folder: string)` → returns `{ url, fileId }`
   - `deleteImage(fileId: string)` → void
   - Install `@imagekit/nodejs` package: `npm install @imagekit/nodejs`

2. **Optional auth middleware** — `middleware/optionalAuth.ts`:
   - Check for `admin-token` cookie → verify with `verifyToken()` from `lib/auth.ts` → set `req.user` if valid
   - Fall back to `student-token` cookie → verify → set `req.student` if valid
   - If neither present or verification fails, pass through silently (no error)
   - Never block the request — this is detection only

3. **Bug report routes** — `routes/bug-reports.ts`:
   - `POST /` — Create bug report (no auth required, optionalAuth detects identity):
     - Zod schema: category (enum: 'bug', 'feedback', 'feature_request'), severity (enum: 'low', 'medium', 'high', 'critical', default 'medium'), description (min 10, max 5000), stepsToReproduce (optional, max 5000), url (optional), userAgent (optional), viewport (optional), errorMessage (optional), errorStack (optional), screenshot (optional, string — base64 data)
     - If screenshot is provided and ImageKit is configured: decode base64, upload to ImageKit (folder: `/bug-reports/${orgId}`), store returned URL in screenshotUrl
     - If ImageKit not configured, ignore screenshot (don't fail)
     - Detect req.user → reporterType='admin', reporterId=user.id, reporterEmail=user.email, reporterName=user.name
     - Detect req.student → reporterType='student', reporterId=student.id, reporterEmail=student.email, reporterName=`${student.firstName} ${student.lastName}`
     - Otherwise → reporterType='anonymous'
     - Return `{ success: true, data: { id, category, severity, status, createdAt } }`
   - `GET /` — List reports (requireAuth, admin only):
     - Query params: page (default 1), limit (default 20), status (optional filter)
     - Return paginated: `{ success: true, data: reports, pagination: { page, limit, total, totalPages } }`
     - Scoped to orgId

4. **Mount routes** in `app.ts`:
   - Import bugReportRoutes and optionalAuth
   - Add: `app.use('/api/bug-reports', submitLimiter, optionalAuth, bugReportRoutes);`
   - Place it after the student routes line and before the error handler

**Frontend:**

5. **Bug report hooks** — `app/src/hooks/useBugReports.ts`:
   - `useSubmitBugReport()` mutation — POST /api/bug-reports
   - `useBugReports(page, limit, status?)` query — GET /api/bug-reports (admin only)
   - Follow patterns from useAssessments.ts

6. **Types** in `app/src/types/api.ts`:
   - `BugReport` interface (matches Prisma model shape for GET responses)
   - `BugReportSubmission` interface (POST payload shape)

7. **BugReportDialog** — `app/src/components/BugReportDialog.tsx`:
   - shadcn Dialog with form: category (Select), severity (Select), description (Textarea, required), stepsToReproduce (Textarea, optional)
   - Auto-capture on open: window.location.href, navigator.userAgent, `${window.innerWidth}x${window.innerHeight}`
   - "Capture Screenshot" button: use `html2canvas` to capture document.body, convert to base64, show thumbnail preview. Install: `cd app && npm install html2canvas`
   - Submit via useSubmitBugReport mutation, toast success, reset form on success
   - Props: `open: boolean`, `onOpenChange: (open: boolean) => void`

8. **BugReportButton** — `app/src/components/BugReportButton.tsx`:
   - Fixed position bottom-right: `fixed bottom-6 right-6 z-50`
   - Circular button with Bug icon from lucide-react
   - Toggles BugReportDialog open/closed
   - Renders the dialog alongside itself

9. **Mount globally** in `app/src/App.tsx`:
   - Add `<BugReportButton />` after the `<Routes>` block (inside the Router, outside the Routes)
   - It should appear on every page — admin, student, and public

10. **Admin view page** — `app/src/pages/admin/BugReports.tsx`:
    - Simple table page: columns = Category, Severity, Description (truncated), Reporter, Status, Date
    - Severity badges with color coding: critical=red, high=orange, medium=yellow, low=gray
    - Category badges: bug=red, feedback=blue, feature_request=purple
    - Pagination controls
    - Link a route for this page (add to admin layout routes in App.tsx as "/bug-reports")
    - Add "Bug Reports" tab to the admin nav in AdminLayout.tsx

What NOT to Do:
- Do not implement GitHub issue creation (Phase 2)
- Do not implement React error boundary (Phase 2)
- Do not add screenshot compression with sharp on the backend (just upload the raw buffer)
- Do not make the bug report button draggable or dismissable
- Do not add status update/triage endpoints (admin can view only for now)

Acceptance Criteria:
- [ ] Floating bug icon button visible on every page
- [ ] Bug report dialog captures category, severity, description, optional steps + screenshot
- [ ] Screenshot capture works via html2canvas → ImageKit upload
- [ ] Reports stored in database scoped to org
- [ ] Optional auth correctly identifies admin, student, or anonymous reporters
- [ ] Admin "Bug Reports" page shows paginated list with category/severity badges
- [ ] App still works if ImageKit is not configured (screenshot silently skipped)
- [ ] `cd app && npx tsc --noEmit` passes
- [ ] `npm run lint` passes

Verification:
cd app && npx tsc --noEmit
npm run lint
cd app && npx vite build
```

---

### Task 8: Student Review Gating

- **Agent:** Codex
- **Branch:** task-8-review-gating
- **Depends on:** Task 1 (schema), Task 3 (student flow), Task 6 (shared helpers)
- **Files to modify:** `routes/student-auth.ts`, `routes/public.ts`, `app/src/pages/public/take-assessment/AssessmentResults.tsx`, `app/src/pages/student/AssessmentReview.tsx`, `app/src/types/api.ts`

#### Prompt

```
Context: MedEdPrep Instructor Tools — Express 5, Prisma 5, React 19. The Assessment model now has an `allowStudentReview` boolean field (default false). Shared helpers `buildReviewQuestions`, `normalizeAnswer`, `mapChoice` are now in `lib/services/quiz-scoring.ts`.

Problem: Students can always access the review page regardless of whether the instructor wants them to see answers and explanations. The `allowStudentReview` field exists in the schema but is not enforced anywhere.

Current State:
- `routes/student-auth.ts` — Has a GET `/assessments/:id/review` endpoint that returns the full question breakdown with correct answers and explanations. It checks `resultsReleased` but does NOT check `allowStudentReview`.
- `app/src/pages/student/AssessmentReview.tsx` — Student-facing review page. Displays questions with correct/incorrect answers, explanations, and page numbers.
- `app/src/pages/public/take-assessment/AssessmentResults.tsx` — After Task 3, this shows account creation prompt with separate firstName/lastName fields. Currently always says "review your answers" — should be conditional on whether review is allowed.
- `routes/public.ts` — The GET `/assessment/:hash` endpoint returns assessment metadata (title, description, questionCount, timeLimitMinutes). Does not currently include `allowStudentReview`.

Changes Required:

1. **Backend gating** in `routes/student-auth.ts`:
   - In the GET `/assessments/:id/review` endpoint, after fetching the assessment, check `assessment.allowStudentReview`
   - If false, return 403 with error: `{ success: false, error: { code: 'REVIEW_NOT_ALLOWED', message: 'The instructor has not enabled review for this assessment.' } }`
   - Keep the existing `resultsReleased` check as well — both must be true

2. **Include allowStudentReview in public metadata** in `routes/public.ts`:
   - Add `allowStudentReview` to the GET `/assessment/:hash` response object so the frontend knows whether to show review messaging

3. **Update PublicAssessmentInfo type** in `app/src/types/api.ts`:
   - Add `allowStudentReview?: boolean` to the `PublicAssessmentInfo` interface

4. **Conditional messaging** in AssessmentResults.tsx:
   - Accept `allowStudentReview` as a prop (passed from TakeAssessment which gets it from usePublicAssessment)
   - If `allowStudentReview` is true: show "Create your account to review your answers, explanations, and track your progress"
   - If false: show "Create your account to track your progress and view your scores"
   - Don't block account creation either way — just change the messaging

5. **Student review page** in AssessmentReview.tsx:
   - Handle the 403 error gracefully — show a message like "Review is not available for this assessment" instead of a generic error

What NOT to Do:
- Do not modify the buildReviewQuestions logic
- Do not change how the review page renders questions (only add error handling)
- Do not remove the resultsReleased check
- Do not add any admin UI changes (toggle is handled in Task 5)

Acceptance Criteria:
- [ ] Review endpoint returns 403 when allowStudentReview is false
- [ ] Review endpoint still requires resultsReleased to be true
- [ ] Public assessment metadata includes allowStudentReview field
- [ ] Post-quiz messaging varies based on allowStudentReview
- [ ] Student review page shows friendly message on 403
- [ ] `cd app && npx tsc --noEmit` passes

Verification:
cd app && npx tsc --noEmit
npm run lint
cd app && npx vite build
```

---

## Dispatch

Run the setup script to create worktrees:

```bash
../workflow/setup-worktrees.sh all
```

Or specific waves:

```bash
../workflow/setup-worktrees.sh 1-4    # Wave 1
../workflow/setup-worktrees.sh 5-7    # Wave 2
../workflow/setup-worktrees.sh 8      # Wave 3
```

## Merge Order

1. Merge Wave 1 branches (Tasks 1-4) into main one at a time, running integration checks after each
2. Merge Wave 2 branches (Tasks 5-7) — Task 7 touches App.tsx and AdminLayout.tsx so merge it last in Wave 2
3. Merge Wave 3 (Task 8) last — it depends on Tasks 1, 3, and 6
