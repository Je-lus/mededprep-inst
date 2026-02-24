# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** The app must look and feel professional across both themes — no broken layouts, no unreadable text, no white flashes when switching themes
**Current focus:** Phase 4 — Glass Purple Visual Effects

## Current Position

Phase: 4 of 5 (Glass Purple Visual Effects)
Plan: 2 of 3 in current phase (04-02 complete)
Status: In progress
Last activity: 2026-02-24 — Plan 04-02 complete: Glass Purple CSS effects added (glass card backdrop-filter blur, button glow, smooth theme transition); Card updated with glass-card className; npm run build and typecheck pass clean

Progress: [████████░░] 47%

## Performance Metrics

**Velocity:**

- Total plans completed: 8
- Average duration: 2.1 min
- Total execution time: 0.2 hours

**By Phase:**

| Phase                          | Plans | Total | Avg/Plan |
| ------------------------------ | ----- | ----- | -------- |
| 01-atomic-css-migration        | 2     | 8 min | 4 min    |
| 02-theme-infrastructure        | 2     | 3 min | 1.5 min  |
| 03-admin-sidebar-appshell      | 2     | 3 min | 1.5 min  |
| 04-glass-purple-visual-effects | 2     | 3 min | 1.5 min  |

**Recent Trend:**

- Last 5 plans: 3 min, 2 min, 1 min, 1 min, 2 min
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
- 03-01: AdminSidebar uses map over navItems const array (not 7 individual NavLink elements) — DRY pattern; runtime behavior identical; verification count reflects literal occurrences only.
- 03-01: ThemeToggle placed in sidebar header per plan requirement THM-06.
- 03-01: !important on glass-purple .nav-active overrides Tailwind bg-primary/10 — no JSX theme-conditional logic needed.
- 03-02: sidebar-glass applied to inner div inside fixed aside (not the aside itself) — prevents stacking context trap where backdrop-filter breaks child fixed positioning.
- 03-02: No ThemeToggle in AppShell — ThemeToggle lives in AdminSidebar header; mobile users open Sheet to access it.
- 03-02: bg-card Tailwind fallback on both sidebar containers — Glass Purple CSS overrides with rgba; Daylight uses white card background.
- 04-01: Sheet was already installed from Phase 3 (AppShell uses Sheet for mobile drawer) — only 5 new components needed when plan specified 6.
- 04-01: tsconfig.app.json with test file exclusions was pre-existing — no TypeScript config changes needed; build gate clean from start.
- 04-02: Glass Purple CSS effects use [data-theme='glass-purple'] selectors — ThemeContext sets glass-purple not glass; plan spec of glass was incorrect and silently inert.
- 04-02: backdrop-filter excluded from universal transition rule — animating backdrop-filter causes GPU jank; only background-color, color, border-color, box-shadow transitioned.
- 04-02: glass-card class on Card is always present (not conditional) — inert in Daylight, activated by CSS selector in Glass Purple; no JSX logic needed.

### Pending Todos

None yet.

### Blockers/Concerns

- Tailwind opacity modifier regression confirmed: `bg-primary/50` syntax does not work with raw hex in Tailwind v3. Documented as known limitation. Phase 4 will restore hover effects via Glass Purple-specific CSS.
- Research flagged: Glass Purple blur performance on mid-range Android must be validated manually during Phase 4. If jank occurs, reduce blur radius or disable for `@media (pointer: coarse)`.

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 04-02-PLAN.md — Glass Purple CSS effects (glass card, button glow, smooth transition) added; Card updated with glass-card className; build and typecheck pass; ready for Phase 4 Plan 03
Resume file: None
