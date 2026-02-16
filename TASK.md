# Task 3: Question Bank — Full Stack

> Read AGENTS.md first for project context, then implement the task below.
> After completing, verify your work compiles and passes lint.

---

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
