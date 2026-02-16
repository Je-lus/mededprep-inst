# Task 4: Attendance — Full Stack (Copy from mededprep-ce)

> Read AGENTS.md first for project context, then implement the task below.
> After completing, verify your work compiles and passes lint.

---

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
- [x] Session CRUD works (create, list, update, delete, publish)
- [x] QR codes generated for check-in and checkout
- [x] Public check-in flow works: scan QR → enter info → checked in
- [x] Public checkout flow works: scan QR → enter email → checked out
- [x] Admin can view attendee list, manually check in/out, update status
- [x] "Attendance" tab in admin nav
- [ ] `cd app && npx tsc --noEmit` passes
- [ ] `npm run lint` passes

Verification:
cd app && npx tsc --noEmit
npm run lint
cd app && npx vite build
