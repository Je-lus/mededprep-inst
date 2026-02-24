# Roadmap: Premium UI Upgrade — Daylight + Glass Purple

## Overview

This milestone transforms the flat white instructor UI into a polished 2-theme system (Daylight and Glass Purple). The work is ordered by hard technical dependencies: the CSS variable format must be migrated atomically before any theme switching can work, the ThemeProvider must exist before glass effects can be triggered, and the admin sidebar must exist before glass effects can be applied to it. The final phase completes the visual polish — SurveyJS dark mode, a full semantic color sweep to eliminate hardcoded grays, and the student layout upgrade.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Atomic CSS Migration** - Migrate all CSS variables from HSL-component format to raw hex atomically (completed 2026-02-24)
- [x] **Phase 2: Theme Infrastructure** - ThemeContext provider, localStorage persistence, FOUC prevention, and sun/moon toggle (completed 2026-02-24)
- [x] **Phase 3: Admin Sidebar & AppShell** - Replace horizontal tab nav with fixed sidebar, mobile Sheet drawer, and responsive layout (completed 2026-02-24)
- [x] **Phase 4: Glass Purple Visual Effects** - Body gradient, glass card blur, glass sidebar, button glow, and transition utilities (completed 2026-02-24)
- [ ] **Phase 5: SurveyJS Sync, Color Sweep & Student Layout** - Theme-aware assessments, full semantic color sweep, student layout upgrade, and final quality gate

## Phase Details

### Phase 1: Atomic CSS Migration

**Goal**: The app renders identically to current state but with a clean CSS variable foundation — raw hex values, semantic-only Tailwind tokens, no HSL coupling — enabling all subsequent theme work
**Depends on**: Nothing (first phase)
**Requirements**: CSS-01, CSS-02, CSS-03, CSS-04, CSS-05, CSS-06
**Success Criteria** (what must be TRUE):

1. The app renders visually identical to the pre-migration state in the browser — no colors, borders, or shadows have changed
2. `var(--primary)` resolves directly to `#1b5fd0` in DevTools with no `hsl()` wrapper anywhere in index.css or tailwind.config.js
3. Searching source files for `hsl(var(--` returns zero results
4. Searching source files for `primary-500`, `primary-100`, `primary-50`, `primary-600`, `primary-700` utility classes returns zero results
5. `npm run build` and `npm run typecheck` pass with zero errors

**Plans:** 2/2 plans complete

Plans:

- [ ] 01-01-PLAN.md — Fix build prerequisites (install missing @testing-library packages, resolve TypeScript errors)
- [ ] 01-02-PLAN.md — Atomic CSS migration (hex variables, var() config, Glass Purple block, 20-file class replacement)

### Phase 2: Theme Infrastructure

**Goal**: Users can switch between Daylight and Glass Purple themes via a toggle button, the preference survives page reloads, and there is no white flash when loading Glass Purple
**Depends on**: Phase 1
**Requirements**: THM-01, THM-02, THM-03, THM-04, THM-05, THM-06
**Success Criteria** (what must be TRUE):

1. Clicking the sun/moon toggle button switches the entire UI between Daylight and Glass Purple immediately
2. Refreshing the page after selecting Glass Purple restores Glass Purple without any white flash
3. A user visiting for the first time with `prefers-color-scheme: dark` system preference sees Glass Purple automatically
4. The toggle button is present in both the admin area and the student area
5. `npm run build` and `npm run typecheck` pass with zero errors

**Plans:** 2/2 plans complete

Plans:

- [ ] 02-01-PLAN.md — Core theme infrastructure (ThemeProvider, FOUC script, localStorage persistence, system preference detection)
- [ ] 02-02-PLAN.md — ThemeToggle component and placement in AdminLayout and StudentLayout headers

### Phase 3: Admin Sidebar & AppShell

**Goal**: Admin users navigate via a vertical sidebar (fixed on desktop, Sheet drawer on mobile) that replaces the horizontal tab header, with the theme toggle embedded in the sidebar header
**Depends on**: Phase 2
**Requirements**: LAY-01, LAY-02, LAY-03, LAY-04, LAY-05, LAY-06, LAY-07, LAY-08
**Success Criteria** (what must be TRUE):

1. The admin area has a fixed left sidebar with links to Dashboard, Assessments, Question Banks, Attendance, Students, Bug Reports, and Instructors (owner-only); the old horizontal tab header is gone
2. On a mobile viewport the sidebar is hidden and a hamburger icon opens it as a Sheet drawer from the left
3. The active nav item is visually distinguished — glass glow indicator in Glass Purple, primary highlight in Daylight
4. In Glass Purple the sidebar renders with backdrop-filter blur and a semi-transparent background; the body shows the purple radial gradient
5. `npm run build` and `npm run typecheck` pass with zero errors

**Plans:** 2/2 plans complete

Plans:

- [ ] 03-01-PLAN.md — AdminSidebar component, Sheet installation, and glass CSS rules
- [ ] 03-02-PLAN.md — AppShell layout and AdminLayout replacement

### Phase 4: Glass Purple Visual Effects

**Goal**: Glass Purple feels visually distinct and premium — deep purple gradient background, frosted glass card surfaces, glowing primary buttons, and smooth transitions on theme switch — with no layout regressions in Daylight
**Depends on**: Phase 3
**Requirements**: CMP-01, CMP-02, CMP-03, CMP-04, CMP-05, CMP-06
**Success Criteria** (what must be TRUE):

1. In Glass Purple, Card components render with backdrop-filter blur(12px) and a semi-transparent surface; in Daylight they render as solid white cards with no blur
2. In Glass Purple, hovering a primary Button shows a purple box-shadow glow; in Daylight it shows the standard hover state
3. Switching themes produces a smooth color transition (approximately 0.25s) with no jarring flash on background, sidebar, or cards
4. All six new shadcn/ui components (Sheet, Tooltip, ScrollArea, Popover, Checkbox, Switch) are installed and usable
5. `npm run build` and `npm run typecheck` pass with zero errors

**Plans:** 2/2 plans complete

Plans:

- [ ] 04-01-PLAN.md — Install six shadcn/ui components and establish clean build baseline
- [ ] 04-02-PLAN.md — Glass card backdrop blur, primary button glow, and smooth theme transition CSS

### Phase 5: SurveyJS Sync, Color Sweep & Student Layout

**Goal**: Every surface in the app — including SurveyJS assessments, student pages, and all component/page files — renders correctly in both themes with no hardcoded gray or white classes surviving
**Depends on**: Phase 2 (SurveyJS and student layout require ThemeContext); Phase 4 complete before color sweep is verifiable
**Requirements**: SJS-01, SJS-02, SJS-03, SJS-04, SJS-05, CLR-01, CLR-02, CLR-03, CLR-04, CLR-05, CLR-06, CLR-07, CLR-08, CLR-09, STU-01, STU-02, STU-03, STU-04, QAL-01, QAL-02, QAL-03, QAL-04, QAL-05
**Success Criteria** (what must be TRUE):

1. Taking an assessment in Glass Purple shows dark backgrounds, purple primary color, and readable light text throughout the SurveyJS player; taking it in Daylight looks identical to the current behavior
2. The student layout displays Glass Purple background effects and has a working sun/moon toggle in the header; theme preference carries over from the admin side
3. Grep for `bg-white`, `bg-gray-`, `text-gray-`, `border-gray-`, `text-slate-`, `border-slate-`, `primary-50`, `primary-100`, `primary-500` across all non-test source files returns zero results
4. All admin pages (dashboard, assessment creation, take-assessment flow) render correctly in both themes on desktop and mobile with no broken layouts
5. `npm run build` and `npm run typecheck` pass clean; QR code backgrounds remain white (intentional preservation confirmed)

**Plans:** 2/5 plans executed

Plans:

- [ ] 05-01-PLAN.md — SurveyJS theme sync (theme-aware applyTheme in TakeAssessment)
- [ ] 05-02-PLAN.md — Student layout upgrade (ThemeContext, glass effects, toggle)
- [ ] 05-03-PLAN.md — Color sweep: components and public/shared pages (15 files)
- [ ] 05-04-PLAN.md — Color sweep: admin pages and student pages + final grep verification (20 files)
- [ ] 05-05-PLAN.md — Quality gate: build, typecheck, and visual verification checkpoint

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase                                          | Plans Complete | Status      | Completed  |
| ---------------------------------------------- | -------------- | ----------- | ---------- |
| 1. Atomic CSS Migration                        | 2/2            | Complete    | 2026-02-24 |
| 2. Theme Infrastructure                        | 2/2            | Complete    | 2026-02-24 |
| 3. Admin Sidebar & AppShell                    | 2/2            | Complete    | 2026-02-24 |
| 4. Glass Purple Visual Effects                 | 2/2            | Complete    | 2026-02-24 |
| 5. SurveyJS Sync, Color Sweep & Student Layout | 2/5            | In Progress |            |
