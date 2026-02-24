---
phase: 01-atomic-css-migration
plan: 02
subsystem: ui
tags: [tailwind, css-variables, theming, glass-purple, react]

# Dependency graph
requires:
  - phase: 01-atomic-css-migration
    provides: Build baseline fixed (plan 01-01) — npm install restored node_modules
provides:
  - Hex CSS variables in :root replacing HSL-component format
  - Glass Purple theme variables under [data-theme='glass'] selector
  - Tailwind config using var(--xxx) without hsl() wrappers
  - All primary-NNN class references replaced with semantic equivalents
affects:
  - 02-glass-theme (theme switching logic depends on [data-theme='glass'])
  - 03-admin-sidebar-appshell (nav components use border-primary, text-primary)
  - 04-qr-presenter-polish (glass hover effects need CSS var infrastructure)
  - 05-student-portal-theming (portal shares CSS variable system)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'CSS variables store raw hex values — no hsl() wrapper anywhere in :root'
    - 'Tailwind color tokens reference var(--xxx) directly'
    - "[data-theme='glass'] selector overrides all CSS variables for Glass Purple theme"
    - 'Semantic color classes (bg-primary, text-primary) instead of static shade classes'

key-files:
  created: []
  modified:
    - app/src/index.css
    - app/tailwind.config.js
    - app/src/components/AdminLayout.tsx
    - app/src/components/BugReportButton.tsx
    - app/src/components/BugReportDialog.tsx
    - app/src/components/StatusBadge.tsx
    - app/src/components/ToggleSwitch.tsx
    - app/src/pages/Dashboard.tsx
    - app/src/pages/Welcome.tsx
    - app/src/pages/admin/AssessmentCreate.tsx
    - app/src/pages/admin/AssessmentDetail.tsx
    - app/src/pages/admin/AssessmentList.tsx
    - app/src/pages/admin/InstructorList.tsx
    - app/src/pages/admin/QrPresenter.tsx
    - app/src/pages/admin/QuestionBankCreate.tsx
    - app/src/pages/admin/QuestionBankDetail.tsx
    - app/src/pages/admin/QuestionBankList.tsx
    - app/src/pages/admin/SessionDetail.tsx
    - app/src/pages/admin/SessionList.tsx
    - app/src/pages/admin/assessment-detail/EditAssessmentDialog.tsx
    - app/src/pages/admin/assessment-detail/QrCodeTab.tsx
    - app/src/pages/public/take-assessment/StudentInfoStep.tsx

key-decisions:
  - 'Opacity modifiers (bg-primary/90, bg-primary/10) silently no-op with hex CSS vars in Tailwind v3 — accepted as known behavior matching portal; Phase 4 will restore hover effects via Glass Purple-specific CSS'
  - 'All 22 files committed as a single atomic commit — any intermediate state would break every semantic color in the app'
  - 'Welcome.tsx used bg-blue-100 for the student icon background — left unchanged as it is a static blue tint unrelated to the primary color token'

patterns-established:
  - 'Semantic color pattern: always use bg-primary/text-primary/border-primary instead of static shade classes like bg-primary-500'
  - "Theme override pattern: [data-theme='glass'] selector on <html> or wrapper element overrides all CSS vars"

requirements-completed:
  - CSS-01
  - CSS-02
  - CSS-03
  - CSS-04
  - CSS-05
  - CSS-06

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 1 Plan 02: Atomic CSS Migration Summary

**Hex CSS variables replacing HSL-component format, Glass Purple theme variables added, and all 47 primary-NNN class references migrated to semantic equivalents across 20 component files in a single atomic commit**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-24T16:33:47Z
- **Completed:** 2026-02-24T16:36:56Z
- **Tasks:** 2 (committed together as 1 atomic commit)
- **Files modified:** 22

## Accomplishments

- Migrated all `:root` CSS variables from HSL-component format to raw hex values (CSS-06)
- Added `[data-theme='glass']` block with complete Glass Purple palette for Phase 2 theme switching (CSS-05)
- Converted `tailwind.config.js` from `hsl(var(--xxx))` to `var(--xxx)` and removed static `primary-50/100/500/600/700` entries (CSS-01, CSS-02)
- Replaced all 47 `primary-NNN` class references with semantic equivalents across 20 component files (CSS-03)
- Migrated global `border-color` rule from `hsl(var(--border))` to `var(--border)` (CSS-04)
- Build (`npm run build`) and typecheck (`npm run typecheck`) both pass with zero errors

## Task Commits

Tasks 1 and 2 were committed together as a single atomic commit per plan specification:

1. **Tasks 1+2: Migrate CSS variables, Tailwind config, and all primary-NNN class refs** - `0bde906` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/src/index.css` - Hex CSS variables under `:root`, Glass Purple variables under `[data-theme='glass']`, `border-color: var(--border)`, `.sd-root-modern` revert block preserved
- `app/tailwind.config.js` - All color tokens use `var(--xxx)`, static primary shades removed
- `app/src/components/AdminLayout.tsx` - Active nav: `border-primary-500` → `border-primary`, `text-primary-500` → `text-primary`
- `app/src/components/BugReportButton.tsx` - `bg-primary-500 hover:bg-primary-500/90` → `bg-primary hover:bg-primary/90`
- `app/src/components/BugReportDialog.tsx` - Same bg-primary migration
- `app/src/components/StatusBadge.tsx` - `bg-primary-500 text-white hover:bg-primary-500` → `bg-primary text-white hover:bg-primary`
- `app/src/components/ToggleSwitch.tsx` - `peer-checked:bg-primary-500` → `peer-checked:bg-primary`
- `app/src/pages/Dashboard.tsx` - `text-primary-500` → `text-primary`, `bg-primary-500 hover:bg-primary-500/90` → `bg-primary hover:bg-primary/90`
- `app/src/pages/Welcome.tsx` - `text-primary-500` → `text-primary`, `hover:border-primary-500/50` → `hover:border-primary/50`
- `app/src/pages/admin/AssessmentCreate.tsx` - All `bg-primary-500 hover:bg-primary-500/90` → `bg-primary hover:bg-primary/90`
- `app/src/pages/admin/AssessmentDetail.tsx` - Same bg-primary migration
- `app/src/pages/admin/AssessmentList.tsx` - Same bg-primary migration
- `app/src/pages/admin/InstructorList.tsx` - Same bg-primary migration
- `app/src/pages/admin/QrPresenter.tsx` - `text-primary-500` → `text-primary`, `bg-primary-500/10` → `bg-primary/10`
- `app/src/pages/admin/QuestionBankCreate.tsx` - Same bg-primary migration
- `app/src/pages/admin/QuestionBankDetail.tsx` - Same bg-primary migration (5 occurrences)
- `app/src/pages/admin/QuestionBankList.tsx` - Same bg-primary migration
- `app/src/pages/admin/SessionDetail.tsx` - Same bg-primary migration (2 occurrences)
- `app/src/pages/admin/SessionList.tsx` - Same bg-primary migration
- `app/src/pages/admin/assessment-detail/EditAssessmentDialog.tsx` - Same bg-primary migration
- `app/src/pages/admin/assessment-detail/QrCodeTab.tsx` - Same bg-primary migration
- `app/src/pages/public/take-assessment/StudentInfoStep.tsx` - Same bg-primary migration

## Decisions Made

- Committed Tasks 1 and 2 as a single atomic commit — any intermediate state (CSS vars migrated but Tailwind config still uses hsl() wrappers, or vice versa) would break every semantic color in the app
- Opacity modifiers (`bg-primary/90`, `bg-primary/10`) silently no-op with raw hex CSS vars in Tailwind v3 — accepted as known behavior documented in plan; Phase 4 will restore hover effects via Glass Purple-specific CSS
- The `bg-blue-100` class in Welcome.tsx for the student icon background was left unchanged — it is a static blue tint unrelated to the primary color token system

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The pre-commit hook (lint-staged) ran prettier on the 20 TypeScript/TSX files and reformatted some minor whitespace (long lines, trailing spaces). All changes were cosmetic formatting and included in the same atomic commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CSS variable infrastructure is fully migrated — `var(--primary)` resolves to `#1b5fd0` in Daylight mode
- `[data-theme='glass']` selector is defined with complete Glass Purple palette — Phase 2 can implement theme switching by toggling this attribute on `<html>`
- All component files use semantic color classes — adding new components should follow `bg-primary`/`text-primary`/`border-primary` pattern, not static shades
- The opacity modifier limitation (`bg-primary/90` no-ops with hex vars) is documented and expected — Phase 4 will address hover effects

---

_Phase: 01-atomic-css-migration_
_Completed: 2026-02-24_
