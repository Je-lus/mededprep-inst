---
phase: 04-glass-purple-visual-effects
plan: 02
subsystem: ui
tags: [css, tailwind, glass-morphism, backdrop-filter, theme, transitions]

# Dependency graph
requires:
  - phase: 04-01
    provides: Clean build baseline with all shadcn/ui components installed
  - phase: 03-admin-sidebar-appshell
    provides: ThemeContext setting data-theme="glass-purple" on documentElement; Phase 3 glass sidebar CSS patterns in index.css
  - phase: 01-atomic-css-migration
    provides: Raw hex CSS variables under [data-theme='glass'] and [data-theme='glass-purple'] selectors
provides:
  - Frosted glass card effect via [data-theme='glass-purple'] .glass-card CSS rule with backdrop-filter blur(12px)
  - Purple button glow on hover via [data-theme='glass-purple'] button.bg-primary:hover box-shadow rule
  - Smooth theme transition via universal * transition rule on background-color, color, border-color, box-shadow
  - Card component updated with glass-card className for CSS targeting
affects:
  - 04-03 and all subsequent Glass Purple work (visual polish baseline established)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'CSS-only glass effects: data-theme attribute selector + utility class (glass-card) on component — zero JS, zero React conditional logic'
    - "Theme effect targeting: [data-theme='glass-purple'] .component-class pattern (consistent with Phase 3 sidebar CSS)"
    - 'Universal transition shorthand: background-color, color, border-color, box-shadow — explicitly excludes backdrop-filter (performance)'

key-files:
  created: []
  modified:
    - app/src/index.css
    - app/src/components/ui/card.tsx

key-decisions:
  - "Used [data-theme='glass-purple'] selectors (not [data-theme='glass']) — ThemeContext sets data-theme='glass-purple' not 'glass'; Phase 3 sidebar CSS uses glass-purple; consistency required"
  - 'backdrop-filter excluded from universal transition rule — animating backdrop-filter causes GPU jank per REQUIREMENTS.md research (NN/G guidance)'
  - 'button.tsx left unchanged — glow handled via CSS selector targeting bg-primary class, no React logic needed; opacity modifier no-op is acceptable known limitation'
  - 'glass-card class on Card is always present (not conditional) — inert in Daylight, activated by CSS selector in Glass Purple — simpler than conditional JSX'

patterns-established:
  - "Data-theme CSS targeting: use [data-theme='glass-purple'] prefix for Glass Purple effects, no React conditional rendering"
  - 'Component CSS hooks: add utility class to component (e.g., glass-card) for CSS to target; class is inert by default'

requirements-completed: [CMP-01, CMP-02, CMP-04, CMP-05, CMP-06]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 4 Plan 02: Glass Purple Visual Effects CSS Summary

**Frosted glass cards (backdrop-filter blur), purple button glow on hover, and smooth theme transition — all CSS-only via [data-theme='glass-purple'] selectors with one glass-card className added to Card component**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-24T20:08:04Z
- **Completed:** 2026-02-24T20:10:01Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added CMP-04 glass card CSS: `[data-theme='glass-purple'] .glass-card` with `backdrop-filter: blur(12px)`, `rgba(255,255,255,0.06)` background, and `rgba(255,255,255,0.12)` border
- Added CMP-05 button glow CSS: `[data-theme='glass-purple'] button.bg-primary:hover` with `rgba(139, 92, 246, 0.3/0.4)` purple box-shadow
- Added CMP-06 smooth transition CSS: universal `*` rule animating `background-color 0.25s`, `color 0.15s`, `border-color 0.25s`, `box-shadow 0.25s`
- Added `glass-card` className to Card root div for CSS targeting; inert in Daylight, activated by Phase 4 CSS selector in Glass Purple
- All .sd-root-modern SurveyJS border-color revert block preserved unchanged
- `npm run typecheck` and `npm run build` both pass clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Add glass card, button glow, and smooth transition CSS rules to index.css** - `4aa5645` (feat)
2. **Task 2: Add glass-card className to Card component and verify both themes** - `6076f96` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `app/src/index.css` - Added Phase 4 CSS section with three blocks: smooth transition rule, glass card effect, primary button glow
- `app/src/components/ui/card.tsx` - Added `glass-card` class to Card root div's static className string

## Decisions Made

- Used `[data-theme='glass-purple']` selectors instead of `[data-theme='glass']` as specified in the plan — the ThemeContext actually sets `data-theme="glass-purple"` on documentElement, and all Phase 3 CSS already uses `glass-purple`. Using `glass` would have been inert.
- `backdrop-filter` intentionally excluded from the universal transition rule — animating backdrop-filter is a known performance trap per REQUIREMENTS.md research; only background-color, color, border-color, and box-shadow are transitioned.
- `button.tsx` left unchanged — the glow is applied via the CSS selector `button.bg-primary:hover` which targets the existing Tailwind class. The pre-existing `hover:bg-primary/90` opacity modifier no-op (known Tailwind v3 + hex var limitation from Phase 1) is acceptable since Phase 4 CSS provides the glass hover effect.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used glass-purple data-theme selector instead of glass**

- **Found during:** Task 1 (reading index.css and ThemeContext.tsx before writing CSS)
- **Issue:** Plan specified `[data-theme='glass']` selectors, but ThemeContext.tsx sets `data-theme="glass-purple"` and Phase 3 CSS uses `[data-theme='glass-purple']` — using `glass` would produce CSS rules that never activate
- **Fix:** Used `[data-theme='glass-purple']` throughout for all three CSS blocks
- **Files modified:** app/src/index.css
- **Verification:** Consistent with ThemeContext and Phase 3 patterns; CSS rules will activate when theme is toggled to glass-purple
- **Committed in:** 4aa5645 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug, incorrect CSS selector)
**Impact on plan:** Necessary correction — the wrong selector would have produced silently inert CSS. Fix aligns with existing codebase patterns and makes all three visual effects actually activate.

## Issues Encountered

None — CSS additions were straightforward; typecheck and build passed on first run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Glass Purple visual effects baseline is complete: frosted glass cards, button glow, smooth transitions
- `npm run build` and `npm run typecheck` pass clean — ready for Phase 4 Plan 03
- Visual verification (manual) still needed: check frosted card appearance in Glass Purple, button glow on hover, smooth 0.25s transition on theme switch
- No blockers

## Self-Check: PASSED

All files verified present:

- app/src/index.css: FOUND
- app/src/components/ui/card.tsx: FOUND

Commits verified:

- 4aa5645 (feat: glass card, button glow, transition CSS): FOUND
- 6076f96 (feat: glass-card className on Card): FOUND
