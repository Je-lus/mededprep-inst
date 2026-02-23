# Project Research Summary

**Project:** MedEdPrep Instructor Tools — 2-Theme System (Daylight + Glass Purple)
**Domain:** CSS theme migration + dual-theme implementation (React 19 + Tailwind CSS 3 + shadcn/ui)
**Researched:** 2026-02-23
**Confidence:** HIGH

## Executive Summary

This milestone adds a premium 2-theme system to an existing React 19 / Tailwind CSS 3.4.17 / shadcn/ui admin dashboard. The two themes are "Daylight" (the current light appearance) and "Glass Purple" (a dark glassmorphism aesthetic with deep purple gradients and frosted glass card surfaces). The core implementation challenge is not feature complexity — the theming patterns are well-documented — but migration discipline: the existing codebase uses shadcn/ui's HSL-component CSS variable format (`--primary: 221 76% 46%` consumed via `hsl(var(--primary))`), which must be atomically replaced with raw hex values (`--primary: #1b5fd0` consumed via `var(--primary)`) before any dark mode work can begin. This migration touches `index.css`, `tailwind.config.js`, and 34+ source files simultaneously; any partial state breaks every semantic color in the app.

The recommended approach follows a strict 5-phase build order dictated by dependency constraints: (1) atomic CSS variable migration, (2) ThemeProvider infrastructure with FOUC prevention, (3) admin sidebar redesign with mobile sheet drawer, (4) Glass Purple visual effects (gradient background + glass blur components), and (5) full semantic color sweep to remove remaining hardcoded gray/white classes. SurveyJS theme synchronization is the most complex individual feature — the assessment player (`TakeAssessment.tsx`) currently calls `model.applyTheme()` with hardcoded Daylight colors and must be made theme-aware. The SurveyJS Creator editor should explicitly not be themed.

The primary risks are implementation sequencing and completeness. A partial CSS variable migration is catastrophic (every semantic color breaks simultaneously) and must never be committed in a split state. Glass Purple effects require a gradient background on `<body>` before `backdrop-filter: blur()` has anything to blur through — building glass components before the background infrastructure produces invisible effects. The hardcoded gray/white class sweep (52 occurrences across 24 files) is tedious but must be verified with a grep check before marking complete, since any missed class creates a visible white box in Glass Purple mode. No new npm packages are required.

## Key Findings

### Recommended Stack

No new packages are required. The full theming system is implemented through configuration changes and CSS additions to the existing stack. The critical technical decision is migrating CSS variable format from the current shadcn/ui HSL-component convention to raw hex — this enables direct `var(--primary)` consumption in Tailwind config, SurveyJS color APIs, and inline styles without any wrapper function.

**Core technologies:**

- Tailwind CSS 3.4.17: Config changes only — `darkMode: ['selector', '[data-theme="glass"]']`, replace `hsl(var(--x))` with `var(--x)` across all color entries, remove numeric primary shades (50/100/500/600/700)
- shadcn/ui (Radix UI): CSS variable remapping only — components already use semantic token class names; changing how tokens resolve is transparent to component code
- Custom ThemeContext (~30 lines): Owns theme state, reads/writes `localStorage`, applies `data-theme` attribute to `document.documentElement`; Zustand is available but React Context is simpler for a single piece of global state
- SurveyJS 2.5.10: Uses `model.applyTheme({ colorPalette, cssVariables })` JS API — the `--sjs-*` namespace is separate from app CSS variables and must be synchronized via a `useEffect` watching the theme context

**New shadcn/ui components to install (run from `app/`):**

- `sheet`, `tooltip`, `scroll-area`, `popover`, `checkbox`, `switch` — required for admin sidebar redesign

### Expected Features

**Must have (table stakes) — theme system is broken without these:**

- CSS variable token migration (HSL → hex) — foundation; all other features depend on this
- ThemeContext + localStorage persistence — user preference survives page reload
- FOUC prevention (inline script in `index.html`) — no white flash when loading Glass Purple
- Sun/Moon toggle in admin sidebar and student header
- Glass Purple body gradient background — prerequisite for glass blur effects
- Admin sidebar navigation (replaces horizontal tab nav) — prerequisite for sidebar toggle placement
- Glass card + sidebar backdrop blur — the defining visual differentiator of Glass Purple
- Full semantic color sweep (remove all hardcoded `bg-white`, `bg-gray-*` classes) — 52 occurrences across 24 files
- SurveyJS dark theme for TakeAssessment (student) — assessments are the core product surface
- Mobile sidebar to sheet drawer — responsive is non-negotiable in 2026
- Smooth color transition on theme switch — prevents jarring flash

**Should have (polish that makes Glass Purple feel premium):**

- System preference detection on first visit (no localStorage key → check `prefers-color-scheme: dark`)
- Active nav item glass indicator (glowing pill / left border with glow in Glass Purple)
- Primary button glow on hover in Glass Purple (`shadow-[0_0_16px_rgba(147,51,234,0.5)]`)
- Glass sidebar with backdrop-filter blur
- Sun/Moon icon morph animation (scale + opacity crossfade, ≤200ms)

**Defer to v2+:**

- Per-org theme preference (requires DB schema + admin UI — weeks of scope)
- SurveyJS Creator dark mode (admin editor — low value, very high CSS effort)
- Third theme (only if user research demands it)

**Explicit anti-features (do not build):**

- Three-way toggle (light / dark / system) — system preference handled silently at first load
- Animated background particles / aurora — GPU cost is prohibitive
- Animated `backdrop-filter` — confirmed perf trap (NN/G, MDN, shadcn/ui GitHub #327)
- Glass effects on data tables, form inputs, dropdown menus, or skeleton loaders

### Architecture Approach

The architecture is CSS-first: all purely visual differences between themes are expressed as CSS variable overrides under `[data-theme="glass-purple"]`, with `useTheme()` context reserved only for components that need different React behavior (SurveyJS player, ThemeToggle icon swap). This approach means zero extra re-renders on theme toggle for the 30+ shadcn/ui primitive components. The `data-theme` attribute on `<html>` is the single source of truth for the CSS cascade; `localStorage` is for persistence across sessions; React context exposes the toggle function to JS consumers.

**Major components:**

1. `app/src/index.css` — owns all CSS variable definitions for both themes; `:root` for Daylight, `[data-theme="glass-purple"]` for Glass Purple including glass-specific variables (`--glass-blur`, `--glass-bg`, `--glass-border`, `--glass-glow`, `--gradient-bg`)
2. `app/src/contexts/ThemeContext.tsx` — ThemeProvider + `useTheme()` hook; wraps App in `main.tsx`
3. `app/src/components/ThemeToggle.tsx` — sun/moon button, calls `toggleTheme()`
4. `app/src/components/AppShell.tsx` — new sidebar layout wrapper (fixed desktop, Sheet drawer mobile); separates layout chrome from navigation logic
5. `app/src/pages/public/TakeAssessment.tsx` — must call `model.applyTheme()` via `useEffect` watching `[theme, surveyModel]`; only consumer of `useTheme()` other than ThemeToggle

**Key architectural constraints:**

- Phase 1 migration must be one atomic commit (CSS + Tailwind config + all class references)
- Gradient background must live on `body` via `[data-theme="glass-purple"] body`, not on a React wrapper element (React wrapper creates a stacking context that clips `backdrop-filter` blur)
- Parent containers of glass elements must not use `transform`, `filter`, or `will-change` — these properties create stacking contexts that clip blur to container bounds
- `import 'survey-core/survey-core.min.css'` must remain before `index.css` in import order so the `.sd-root-modern * { border-color: revert; }` block in `index.css` can override SurveyJS defaults

### Critical Pitfalls

1. **Partial CSS variable migration** — Updating `index.css` to hex without simultaneously updating `tailwind.config.js` and all `hsl(var(--x))` inline usages produces `hsl(#1b5fd0)` — invalid CSS — and breaks every semantic color simultaneously. The atomic Phase 1 commit is non-negotiable. Gate with `npm run build` before committing.

2. **The `border-color: hsl(var(--border))` global rule** — Line 37 of the current `index.css` sets this on `*`. After the hex migration, this becomes `border-color: hsl(#e2e8f0)` — silently invalid. Every border in the UI loses its color. This is the most invisible breakage because it looks correct at first glance. Must be updated to `var(--border)` in the same Phase 1 commit. The adjacent `.sd-root-modern * { border-color: revert; }` block must be preserved untouched.

3. **SurveyJS `applyTheme()` with hardcoded Daylight colors** — `TakeAssessment.tsx` currently calls `model.applyTheme()` with static `#1b5fd0` regardless of active theme. In Glass Purple, this renders bright Daylight blue on a dark purple survey background. The fix is a `useEffect` on `[theme, surveyModel]` that conditionally passes `colorPalette: 'dark'` and Glass Purple `--sjs-*` variables. This must not be deferred — assessments are the core product.

4. **Theme flash (FOUC)** — Without an inline script in `index.html`, users with Glass Purple saved in localStorage see a white flash before React mounts and reads localStorage. Add the synchronous inline script to `<head>` in the same phase as ThemeContext, not after.

5. **Hardcoded gray/white classes surviving the sweep** — 52 occurrences of `bg-white`, `bg-gray-*`, `text-gray-*`, `border-gray-*` exist across 24 files (highest density in `AttendSession.tsx` and `CheckOutSession.tsx`). Template literals and `cn()` conditional expressions are easy to miss with simple grep. Run the verification grep after sweep and require zero results before sign-off.

## Implications for Roadmap

Based on the dependency graph across all four research files, a 5-phase structure is recommended. The ordering is dictated by hard technical dependencies, not arbitrary preference.

### Phase 1: Atomic CSS Variable Migration

**Rationale:** Everything depends on this. The HSL-to-hex format change must land before any theme switcher, dark mode class, or Glass Purple color can work correctly. Partially done = fully broken.
**Delivers:** App renders identically to current state (Daylight preserved) but with a clean foundation — hex variables, semantic-only Tailwind tokens, no HSL coupling.
**Addresses:** Table-stakes features: CSS variable token migration, removal of numeric primary shades
**Avoids:** Pitfalls 1 and 2 (partial migration, border-color breakage) — both are addressed in this commit
**Research flag:** None — patterns are well-documented and verified against codebase. Skip `research-phase`.

### Phase 2: ThemeProvider Infrastructure

**Rationale:** All Glass Purple features require a theme state. The FOUC prevention inline script must land with the ThemeProvider, not after it.
**Delivers:** Working theme toggle (sun/moon button), localStorage persistence, no page-load flash, `data-theme` attribute driving CSS cascade
**Addresses:** ThemeContext + localStorage, FOUC prevention, sun/moon toggle, system preference detection on first visit
**Avoids:** Pitfall 4 (FOUC) — inline script in `index.html` is part of this phase
**Research flag:** None — standard React Context pattern, 30 lines of code. Skip `research-phase`.

### Phase 3: Admin Sidebar + AppShell

**Rationale:** The admin sidebar nav is both a prerequisite for where the theme toggle lives and the biggest layout change in the milestone. It must land before glass effects are applied (glass sidebar requires the sidebar to exist). It also requires the shadcn Sheet component which is not yet installed.
**Delivers:** Vertical sidebar navigation (desktop fixed, mobile Sheet drawer), ThemeToggle placed in sidebar header, responsive layout working at all breakpoints
**Addresses:** Admin sidebar navigation, mobile sheet drawer, sidebar background theming
**Uses:** shadcn Sheet, Tooltip, ScrollArea components (install first)
**Avoids:** Pitfall sequence — sidebar must exist before glass sidebar effects in Phase 4
**Research flag:** None — established shadcn/ui AppShell pattern. Skip `research-phase`.

### Phase 4: Glass Purple Visual Effects

**Rationale:** Glass effects are the defining feature of Glass Purple. They can only be built after Phase 2 (ThemeProvider exists to trigger the `[data-theme="glass-purple"]` selector) and Phase 3 (sidebar exists for glass sidebar treatment). The gradient background must land before blur components or `backdrop-filter` has nothing to blur through.
**Delivers:** Deep purple gradient body background, glass card components with backdrop-filter blur, glass sidebar treatment, primary button glow, smooth color transition on theme switch
**Addresses:** Body gradient background, glass card backdrop blur, glass sidebar blur, active nav glass indicator, button glow
**Avoids:** Pitfall 5 (glassmorphism without background layer) — gradient background must be the first step within this phase; glass components come after

**Phase 4 internal ordering:**

1. Body gradient CSS (`[data-theme="glass-purple"] body`) — enables blur effects
2. Glass card component (`backdrop-filter` + semi-transparent background)
3. Glass sidebar treatment
4. Button glow + active nav indicator
5. Smooth CSS transition on toggle

**Research flag:** Low risk — blur parameters and CSS patterns are documented. Performance on mobile needs manual verification before sign-off. No `research-phase` needed but include explicit QA step.

### Phase 5: SurveyJS Theme Sync + Full Semantic Color Sweep

**Rationale:** SurveyJS sync requires ThemeContext (Phase 2) and the color sweep is most efficiently done after glass effects are visible (so broken hardcoded colors are obvious). These two tasks are independent of each other but both depend on Phase 2.
**Delivers:** Assessment player correctly themed in both Daylight and Glass Purple; all 52 hardcoded color class occurrences eliminated; verified zero remaining `bg-white`/`bg-gray-*` in non-test source files
**Addresses:** SurveyJS Glass Purple sync, full semantic color sweep (Pitfall 3, Pitfall 7, Pitfall 6)
**Avoids:** Pitfall 3 (SurveyJS CSS bleed), Pitfall 6 (hardcoded colors surviving sweep), Pitfall 7 (static `applyTheme()` call)

**Verification gate for color sweep:** Run before sign-off:

```bash
grep -rn "bg-white\|bg-gray-\|text-gray-\|border-gray-\|primary-50\b\|primary-100\b\|primary-500\b" app/src --include="*.tsx" --include="*.ts" | grep -v "__tests__"
```

Must return zero results.

**Research flag:** SurveyJS `applyTheme()` integration is well-documented. No `research-phase` needed, but the existing call in `TakeAssessment.tsx` needs careful reading before modification to preserve the existing `.sd-root-modern * { border-color: revert; }` preservation logic.

### Phase Ordering Rationale

- Phase 1 is a hard prerequisite for all other phases — no partial state is acceptable
- Phase 2 (ThemeProvider) must precede Phases 3, 4, and 5 because all visual effects require the `data-theme` attribute to be set
- Phase 3 (AppShell/Sidebar) must precede Phase 4 (glass effects) so glass can be applied to a completed sidebar component
- Phase 4 and 5 are independent of each other after Phase 2 — they could run in parallel on separate branches if development resources allow
- The color sweep (Phase 5) is most useful after Phase 4 because broken hardcoded colors only become visible with Glass Purple active

### Research Flags

Phases with standard patterns (skip `research-phase`):

- **Phase 1** — Atomic CSS migration: well-documented, codebase verified directly, specific grep commands provided
- **Phase 2** — ThemeProvider: standard React Context + localStorage + inline script; all code samples provided in research
- **Phase 3** — AppShell/Sidebar: standard shadcn/ui AppShell pattern; shadcn Sheet documentation is sufficient
- **Phase 4** — Glass effects: CSS-only; patterns documented in ARCHITECTURE.md; needs mobile QA not research
- **Phase 5** — SurveyJS sync: `applyTheme()` API is fully documented; existing call in TakeAssessment.tsx is the starting point

No phases require `research-phase` — all patterns are verified against official documentation and the actual codebase. The risk is execution discipline, not knowledge gaps.

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                                       |
| ------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH       | Verified against Tailwind v3 docs, shadcn/ui docs, codebase inspection; no new packages; version compatibility confirmed    |
| Features     | HIGH       | Official docs for SurveyJS theming; NN/G for glassmorphism patterns; well-established CSS dark mode conventions             |
| Architecture | HIGH       | Direct codebase inspection of all affected files; official shadcn/ui and Tailwind docs; SurveyJS GitHub issue verification  |
| Pitfalls     | HIGH       | Critical pitfalls derived from direct codebase analysis (actual file contents read); confirmed against official repo issues |

**Overall confidence:** HIGH

### Gaps to Address

- **Tailwind opacity modifier regression**: Migrating to raw hex means `bg-primary/50` opacity utilities will not work in Tailwind v3 (requires channel-format or `color-mix()`). Research identified this trade-off as acceptable for this codebase (no extensive opacity modifier usage found). Verify during Phase 1 that no UI relies on opacity modifiers before finalizing the migration.

- **Glass Purple blur performance on mobile**: ARCHITECTURE.md recommends `backdrop-blur` at 12px for cards and 16px for sidebar. These thresholds come from community sources cross-referenced with shadcn/ui GitHub #327. Actual performance on mid-range Android devices should be validated manually during Phase 4 — if jank occurs, reduce blur to 6-8px or disable for `@media (pointer: coarse)`.

- **SurveyJS Creator dark mode**: Explicitly deferred to v2+. The admin assessment creation page uses `survey-creator-core` with its own bundled CSS. This surface will remain in default light styling. This is documented as a known limitation, not a bug.

- **localStorage `SecurityError` in private browsing**: PITFALLS.md flags that `localStorage.getItem` throws `SecurityError` in some private browsing contexts. All `localStorage` calls should be wrapped in `try/catch`. This is a low-risk gap but must be addressed in Phase 2.

## Sources

### Primary (HIGH confidence)

- Tailwind CSS v3 dark mode docs — https://v3.tailwindcss.com/docs/dark-mode (selector strategy, custom selectors, localStorage pattern)
- shadcn/ui theming docs — https://ui.shadcn.com/docs/theming (CSS variable token system, component theming mechanism)
- shadcn/ui Tailwind v4 migration docs — https://ui.shadcn.com/docs/tailwind-v4 (confirms v3 apps still supported; OKLCH is v4-only)
- SurveyJS Themes and Styles docs — https://surveyjs.io/form-library/documentation/manage-default-themes-and-styles (applyTheme API, colorPalette, cssVariables namespace)
- SurveyJS GitHub Issue #5717 — CSS variable scope (body vs `.sd-root-modern`)
- shadcn/ui GitHub Issue #327 — backdrop-filter performance (official project repo, confirmed blur perf regression)
- Tailwind v3 customizing colors — https://v3.tailwindcss.com/docs/customizing-colors (var() support; opacity modifier limitation)
- Direct codebase inspection — `app/src/index.css`, `app/tailwind.config.js`, `app/src/main.tsx`, `app/index.html`, `app/src/pages/public/TakeAssessment.tsx`, `app/src/components/AdminLayout.tsx`, `app/src/components/ui/button.tsx`, `app/src/components/ui/card.tsx`

### Secondary (MEDIUM confidence)

- NN/G Glassmorphism article — https://www.nngroup.com/articles/glassmorphism/ (selective glass application guidance, readability anti-patterns)
- Josh W. Comeau "The Quest for the Perfect Dark Mode" — https://www.joshwcomeau.com/react/dark-mode/ (FOUC prevention patterns)
- Epic React CSS Variables over Context — https://www.epicreact.dev/css-variables (CSS-first theming pattern)
- shadcn/ui GitHub Discussion #1802 — HSL rationale discussion
- MDN backdrop-filter — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter (browser support, ~95% global)

### Tertiary (MEDIUM-LOW confidence)

- Glassmorphism performance research — playground.halfaccessible.com, blog.openreplay.com (blur radius thresholds; cross-referenced with MDN and shadcn issue #327)
- FOUC prevention community implementation — notanumber.in (matches official Tailwind guidance)

---

_Research completed: 2026-02-23_
_Ready for roadmap: yes_
