# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** The app must look and feel professional across both themes — no broken layouts, no unreadable text, no white flashes when switching themes
**Current focus:** Phase 2 — Theme Infrastructure

## Current Position

Phase: 2 of 5 (Theme Infrastructure)
Plan: 2 of 2 in current phase (02-02 complete)
Status: In progress
Last activity: 2026-02-24 — Plan 02-02 complete: ThemeToggle sun/moon button component placed in AdminLayout and StudentLayout headers

Progress: [████░░░░░░] 20%

## Performance Metrics

**Velocity:**

- Total plans completed: 4
- Average duration: 3 min
- Total execution time: 0.2 hours

**By Phase:**

| Phase                   | Plans | Total | Avg/Plan |
| ----------------------- | ----- | ----- | -------- |
| 01-atomic-css-migration | 2     | 8 min | 4 min    |
| 02-theme-infrastructure | 2     | 3 min | 1.5 min  |

**Recent Trend:**

- Last 5 plans: 5 min, 3 min, 2 min
- Trend: Fast

_Updated after each plan completion_

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1: CSS variable migration (HSL → hex) must be a single atomic commit — index.css + tailwind.config.js + all primary-500/100/50 class references simultaneously. Any partial state breaks every semantic color.
- Phase 1: The global `border-color: hsl(var(--border))` rule in index.css must become `var(--border)` in the same commit. The adjacent `.sd-root-modern * { border-color: revert; }` block must be preserved untouched.
- All phases: `npm run build` and `npm run typecheck` must pass after every phase before advancing.
- 01-01: No tsconfig changes needed — package-lock.json was already correct in git; running npm install was sufficient to restore missing node_modules.
- 01-02: Opacity modifiers (bg-primary/90, bg-primary/10) silently no-op with hex CSS vars in Tailwind v3 — accepted as known behavior; Phase 4 will restore hover effects via Glass Purple-specific CSS.
- 01-02: Semantic color pattern established — always use bg-primary/text-primary/border-primary instead of static shade classes (bg-primary-500, etc.).
- 02-01: Use lazy useState initializer (not useEffect) for initial theme read — synchronous, prevents FOUC from React side.
- 02-01: FOUC prevention script placed as first element in <head> before <title> and Vite module script.
- 02-01: ThemeProvider placed inside BrowserRouter but outside App — allows future router hooks in theme-aware components.
- 02-01: All localStorage and matchMedia calls wrapped in try/catch — iOS Safari private browsing throws SecurityError.
- 02-02: aria-label on icon-only toggle buttons describes the action (what clicking will do), not the current state — correct WCAG accessibility pattern.
- 02-02: ThemeToggle placed between user identity info and sign-out/logout button in both layouts — natural visual grouping for session controls.

### Pending Todos

None yet.

### Blockers/Concerns

- Tailwind opacity modifier regression confirmed: `bg-primary/50` syntax does not work with raw hex in Tailwind v3. Documented as known limitation. Phase 4 will restore hover effects via Glass Purple-specific CSS.
- Research flagged: Glass Purple blur performance on mid-range Android must be validated manually during Phase 4. If jank occurs, reduce blur radius or disable for `@media (pointer: coarse)`.

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 02-02-PLAN.md — ThemeToggle component complete in both layouts; Phase 2 theme infrastructure fully wired; next: Phase 3 glass-purple CSS variable definitions
Resume file: None
