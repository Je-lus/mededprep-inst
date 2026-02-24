---
phase: 03-admin-sidebar-appshell
plan: 02
subsystem: ui
tags: [react, shadcn, tailwind, radix-ui, react-router, glass-morphism, responsive]

# Dependency graph
requires:
  - phase: 03-admin-sidebar-appshell/03-01
    provides: AdminSidebar component with onNavigate prop; Sheet primitive at app/src/components/ui/sheet.tsx; sidebar-glass CSS class in index.css
  - phase: 02-theme-infrastructure
    provides: ThemeProvider sets data-theme attribute; bg-card and bg-background CSS variables used in AppShell layout
provides:
  - AppShell layout component with fixed desktop sidebar (w-64), mobile Sheet drawer, and scrollable content area
  - App.tsx wired to use AppShell instead of AdminLayout in all admin ProtectedRoute wrappers
  - AdminLayout.tsx removed — horizontal tab nav fully replaced by vertical sidebar layout
affects:
  - 03-03 (if exists) — all admin routes now flow through AppShell

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Two parallel sidebar trees share one AdminSidebar component — desktop fixed aside + mobile Sheet, same component, no duplication'
    - 'sidebar-glass inner div pattern — backdrop-filter on child div, not fixed aside, avoids stacking context trap'
    - 'z-index layering: desktop sidebar z-20, mobile header z-10, Sheet portal renders at shadcn z-50'
    - 'md:pl-64 content offset matches fixed sidebar width without pushing sidebar into flow'

key-files:
  created:
    - app/src/components/AppShell.tsx
  modified:
    - app/src/App.tsx
  deleted:
    - app/src/components/AdminLayout.tsx

key-decisions:
  - 'sidebar-glass applied to inner div inside fixed aside (not the aside itself) — prevents stacking context trap where backdrop-filter breaks child fixed positioning'
  - 'No ThemeToggle in AppShell — lives in AdminSidebar header (inherited from Plan 01); mobile users open Sheet to access it'
  - 'bg-card Tailwind fallback on both sidebar containers — Glass Purple CSS overrides with rgba; Daylight uses white card background'

patterns-established:
  - 'Pattern 4: Two-tree layout — desktop aside (always rendered, CSS-hidden on mobile) and mobile Sheet (controlled by useState) share a single sidebar component'
  - 'Pattern 5: Fixed sidebar + content offset — aside uses position:fixed, content div uses md:pl-64 to clear it without being pushed by layout flow'

requirements-completed: [LAY-02, LAY-03, LAY-04, LAY-05]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 3 Plan 02: AppShell Assembly Summary

**Fixed desktop sidebar + mobile Sheet drawer layout replacing horizontal AdminLayout tab nav, wired into all admin ProtectedRoute wrappers with TypeScript clean and production build passing**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-24T19:54:06Z
- **Completed:** 2026-02-24T19:55:50Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 1 modified, 1 deleted)

## Accomplishments

- Created AppShell.tsx with fixed desktop sidebar (hidden md:flex w-64 z-20), mobile Sheet drawer controlled by useState, and sticky mobile header with hamburger button
- Updated App.tsx to import and render AppShell instead of AdminLayout in the ProtectedRoute admin wrapper — all 10+ admin routes automatically use new layout
- Deleted AdminLayout.tsx (103-line horizontal tab nav) with zero remaining references in the codebase

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AppShell layout component** - `e603782` (feat)
2. **Task 2: Replace AdminLayout with AppShell in App.tsx and delete AdminLayout** - `1214491` (feat)

## Files Created/Modified

- `app/src/components/AppShell.tsx` - New admin layout: fixed desktop aside with sidebar-glass inner div, mobile Sheet drawer from left, sticky mobile header with hamburger, md:pl-64 content offset, Outlet in max-w-7xl main
- `app/src/App.tsx` - Import swapped from AdminLayout to AppShell; admin ProtectedRoute wrapper renders AppShell; all other routes unchanged
- `app/src/components/AdminLayout.tsx` - Deleted (replaced entirely by AppShell + AdminSidebar)

## Decisions Made

- sidebar-glass class applied to inner `<div>` inside fixed `<aside>`, not to the aside itself — avoids the stacking context trap where applying backdrop-filter to a position:fixed element breaks child fixed positioning
- No ThemeToggle in AppShell — ThemeToggle lives in AdminSidebar header (established in Plan 01); on mobile users open the Sheet to access it; keeps AppShell focused on layout only
- bg-card Tailwind fallback on both sidebar containers — in Glass Purple theme the .sidebar-glass CSS rule overrides with rgba(255,255,255,0.05); in Daylight bg-card provides white background

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Admin sidebar layout is complete and production-build verified
- Desktop fixed sidebar shows at md+ breakpoint; mobile hamburger opens Sheet drawer from left
- Sheet auto-closes on nav link click via onNavigate callback passed to AdminSidebar
- All Glass Purple CSS rules (.sidebar-glass blur, .nav-active glow) activate automatically via data-theme selector once theme is toggled
- Phase 3 Plan 03 (if any) can build on the complete AppShell + AdminSidebar foundation

---

_Phase: 03-admin-sidebar-appshell_
_Completed: 2026-02-24_

## Self-Check: PASSED

- FOUND: app/src/components/AppShell.tsx
- CONFIRMED: app/src/components/AdminLayout.tsx is deleted
- FOUND: .planning/phases/03-admin-sidebar-appshell/03-02-SUMMARY.md
- FOUND: commit e603782 (Task 1: Create AppShell layout component)
- FOUND: commit 1214491 (Task 2: Replace AdminLayout with AppShell)
