# Batch 2 Research — Question Bank, Attendance, Live Results

## Question Bank

### Proposed Models

- `QuestionBank` — id, orgId, title, description, subject, isPublic, createdById, timestamps
- `QuestionBankItem` — id, bankId, questionData (Json — full SurveyElement), tags (String[]), usageCount, lastUsedAt, timestamps

### Flow: Bank → Assessment

- Copy approach: instructor selects questions from bank, frontend clones questionData into surveyJson, creates assessment with existing POST /api/assessments endpoint
- No schema change needed on Assessment model itself

### CSV Import Reuse

- `lib/services/csv-import.ts` already parses CSV into SurveyElement format
- Same parser can import into question bank instead of assessment

### Routes Needed

- GET/POST /api/question-banks — list/create banks
- GET/POST /api/question-banks/:id/items — list/add questions
- PUT/DELETE /api/question-banks/:id/items/:itemId — edit/remove questions

### Frontend

- Question Bank list page + admin nav tab
- Bank editor page (question list + add/edit/delete)
- Question picker component for assessment creation (browse bank, select questions, compose into surveyJson)

### SurveyJS Editor

- `app/src/components/SurveyEditor.tsx` uses SurveyCreatorComponent
- Could reuse for editing individual bank questions
- Or build a simpler form-based editor for bank items

---

## Attendance (from mededprep-ce)

### How It Works in mededprep-ce

- QR-based check-in/check-out tied to Class model
- ClassAttendee model: classId, studentId, status (registered/checked_in/attended/no_show/cancelled), checkedInAt, checkedOutAt
- Time window enforcement: check-in 15min before → 60min after start; checkout 30min before → 60min after end
- Returning students: email lookup pre-fills form
- Self-service checkout: students scan checkout QR, enter email

### Key Files in mededprep-ce

- Schema: prisma/schema.prisma (AttendanceStatus enum, ClassAttendee model)
- Public routes: routes/public.js (register, lookup, checkout endpoints)
- Admin routes: routes/classes.js (attendee management, QR generation)
- Frontend: app/src/pages/public/AttendClass.tsx, CheckOutClass.tsx
- Admin: app/src/pages/admin/class-detail/AttendeeSection.tsx, QrCodeSection.tsx

### For mededprep-inst

- Need standalone attendance (not tied to assessments)
- New model: Session or ClassSession with publicHash for QR
- Attendee join table linking Session to Student
- Reuse existing publicHash + QR patterns from assessments
- Add "Attendance" tab to admin nav

---

## Live Results

### Current State

- Item analysis endpoint (GET /:id/item-analysis) already works on completed responses while assessment is active
- Responses endpoint (GET /:id/responses) returns paginated list

### Implementation Approach

- Add refetchInterval to TanStack Query hooks on responses/item-analysis tabs
- Auto-refresh toggle or "Live" indicator
- Show submission count updating in real time
- Minimal backend changes needed — data is already available
