---
phase: 05-surveyjs-sync-color-sweep-student-layout
plan: 04
subsystem: frontend-ui
tags: [color-sweep, semantic-tokens, tailwind, glass-purple, theme]
dependency_graph:
  requires: [05-01, 05-02]
  provides: [CLR-01, CLR-02, CLR-03, CLR-04, CLR-08, CLR-09]
  affects: [all-admin-pages, all-student-pages]
tech_stack:
  added: []
  patterns: [semantic-tailwind-tokens, intentional-comments, bg-muted/text-muted-foreground]
key_files:
  created: []
  modified:
    - app/src/pages/admin/BugReports.tsx
    - app/src/pages/admin/SessionList.tsx
    - app/src/pages/admin/SessionDetail.tsx
    - app/src/pages/admin/QrPresenter.tsx
    - app/src/pages/admin/assessment-detail/ItemAnalysisTab.tsx
    - app/src/pages/admin/assessment-detail/ResponsesTab.tsx
    - app/src/pages/admin/assessment-detail/QrCodeTab.tsx
    - app/src/pages/student/StudentLogin.tsx
    - app/src/pages/student/ForgotPassword.tsx
    - app/src/pages/student/ResetPassword.tsx
    - app/src/pages/student/StudentDashboard.tsx
    - app/src/pages/student/AssessmentReview.tsx
decisions:
  - 'QrPresenter intentional whites/slates preserved with /* intentional: presenter mode */ comments on adjacent lines (prettier moved them)'
  - 'bg-muted-foreground used for class average progress bar — semantically correct neutral fill'
  - 'ToggleSwitch.tsx bg-white on toggle thumb and public/ pages deferred — outside plan scope'
metrics:
  duration: 5min
  completed: 2026-02-24
  tasks_completed: 2
  tasks_total: 2
  files_modified: 12
---

# Phase 5 Plan 4: Color Sweep — Admin + Student Pages Summary

**One-liner:** Complete semantic token migration across 12 admin/student pages; all hardcoded gray/white/slate classes replaced with bg-muted/text-muted-foreground/border-border/bg-card; QrPresenter and QrCodeTab intentional whites documented; CLR-09 grep verification passes.

## Tasks Completed

| Task | Name                                                  | Commit  | Files                                                                                         |
| ---- | ----------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| 1    | Color sweep - admin pages                             | 1a5b9e4 | BugReports, SessionList, SessionDetail, QrPresenter, ItemAnalysisTab, ResponsesTab, QrCodeTab |
| 2    | Color sweep - student pages + final grep verification | e5292ab | StudentLogin, ForgotPassword, ResetPassword, StudentDashboard, AssessmentReview               |

## Changes Made

### Admin Pages (Task 1)

**BugReports.tsx:**

- `bg-gray-50` page wrapper -> `bg-background`
- Low severity badge: `bg-gray-400 text-white hover:bg-gray-400` -> `bg-muted text-muted-foreground hover:bg-muted`

**SessionList.tsx:**

- Draft state badge: `bg-gray-100 text-gray-600` -> `bg-muted text-muted-foreground`

**SessionDetail.tsx:**

- Draft state badge: `bg-gray-100 text-gray-600` -> `bg-muted text-muted-foreground`

**ItemAnalysisTab.tsx:**

- Incorrect choice container: `border-gray-200 bg-white` -> `border-border bg-card`
- Choice distribution bar: `bg-gray-300` -> `bg-muted`
- Expanded row Card: `bg-white` -> `bg-card`

**ResponsesTab.tsx:**

- Progress bar background: `bg-gray-200` -> `bg-muted`

**QrPresenter.tsx (CLR-08 — special case):**

- All slate/white classes preserved with `/* intentional: presenter mode */` inline comments
- Outer div, Card, text-slate-_, bg-white, bg-slate-_, border-slate-\* all intentionally retained for classroom projector readability

**QrCodeTab.tsx (CLR-08):**

- QR image `bg-white p-2` preserved with `/* intentional: QR code readability requires white background */` comment

### Student Pages (Task 2)

**StudentLogin.tsx:** 3x `text-gray-600` -> `text-muted-foreground`

**ForgotPassword.tsx:** `text-gray-600` -> `text-muted-foreground`

**ResetPassword.tsx:** 2x `text-gray-600` -> `text-muted-foreground`

**StudentDashboard.tsx:** stats card label `text-gray-600` -> `text-muted-foreground`

**AssessmentReview.tsx:**

- Filter count label: `text-gray-600` -> `text-muted-foreground`
- Neutral answer option: `border-slate-200 bg-white text-slate-700` -> `border-border bg-card text-foreground`
- Progress bars: `bg-slate-100` -> `bg-muted`
- Class average bar fill: `bg-slate-400` -> `bg-muted-foreground`
- Circle (unselected) icon: `text-slate-400` -> `text-muted-foreground`

## Verification

### CLR-09 Final Grep

```
grep -rn "bg-white|bg-gray-|text-gray-|border-gray-|text-slate-|border-slate-|primary-50\b|primary-100\b|primary-500\b" app/src/ --include="*.tsx" --include="*.ts" | grep -v "intentional"
```

**Result:** Zero non-intentional forbidden patterns in admin/ and student/ pages.

Remaining grep hits (verified non-issues):

- `QrPresenter.tsx` lines 40/49/60/84/93/110: All intentional presenter mode — comments on adjacent lines (prettier formatting)
- `ToggleSwitch.tsx:23`: `bg-white` on toggle thumb — out of scope (component, not a page)
- `public/take-assessment/*.tsx`: Out of scope (public pages not in this plan)

### TypeScript

`cd app && npx tsc --noEmit` passes with zero errors.

## Deviations from Plan

### Files Already Clean

Several files specified in the plan's action section had no actual forbidden patterns present:

- `AssessmentList.tsx` — already `bg-primary` (no `bg-primary-500`)
- `AssessmentDetail.tsx` — already `bg-primary` (no `bg-primary-500`)
- `AssessmentCreate.tsx` — already `bg-primary` (no `bg-primary-500`)
- `QuestionBankList.tsx` — already clean
- `QuestionBankCreate.tsx` — already `bg-primary`
- `QuestionBankDetail.tsx` — already `bg-primary`
- `InstructorList.tsx` — already `bg-primary`
- `EditAssessmentDialog.tsx` — already `bg-primary`
- `QrPresenter.tsx` — no `text-primary-500` (already `text-primary`)

These files required no changes — prior phase work already addressed them.

### Out-of-Scope Items (Deferred)

- `ToggleSwitch.tsx` `bg-white` on toggle thumb knob — design-intentional, no semantic token for a white toggle knob
- `public/take-assessment/AssessmentResults.tsx` and `TakeAssessment.tsx` — forbidden patterns exist but are outside this plan's file list

## Self-Check: PASSED

Files modified exist: confirmed (12 files)
Commits exist:

- `1a5b9e4` — confirmed
- `e5292ab` — confirmed
