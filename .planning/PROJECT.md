# Premium UI Upgrade: mededprep-inst

## What This Is

A visual upgrade for the MedEdPrep Instructor Tools app — replacing the flat white UI with a polished 2-theme design system (Daylight + Glass Purple), sidebar navigation, and theme-aware components. The goal is to make inst feel like part of the same product family as the MedEdPrep portal while being production-ready with full dark mode support including SurveyJS assessments.

## Core Value

The app must look and feel professional across both themes — no broken layouts, no unreadable text, no white flashes when switching themes. Every page, including SurveyJS-rendered assessments, must render correctly in both Daylight and Glass Purple.

## Requirements

### Validated

<!-- Existing capabilities confirmed from codebase map -->

- ✓ Multi-tenant architecture with org-scoped subdomain routing — existing
- ✓ Admin authentication with JWT + role-based access — existing
- ✓ Student authentication (separate token flow) — existing
- ✓ Assessment creation via CSV import with SurveyJS rendering — existing
- ✓ QR code generation and public assessment delivery — existing
- ✓ Quiz scoring, item analysis, and response tracking — existing
- ✓ Attendance session management with QR check-in — existing
- ✓ Question bank management — existing
- ✓ Bug report system with screenshot upload — existing
- ✓ shadcn/ui component library with Tailwind CSS — existing
- ✓ Mobile-responsive layouts — existing

### Active

<!-- Premium UI upgrade scope -->

- [ ] Fresh 2-theme system: Daylight (light) and Glass Purple (glass/dark)
- [ ] CSS variable migration from HSL components to raw hex values (atomic)
- [ ] Tailwind config migration from hsl(var(--xxx)) to var(--xxx) format
- [ ] Bulk replacement of primary-500/100/50 shade classes to semantic tokens
- [ ] ThemeContext provider with localStorage persistence
- [ ] Simple sun/moon theme toggle button (not dropdown)
- [ ] Admin sidebar navigation replacing horizontal tab header
- [ ] AppShell layout: fixed sidebar (desktop), Sheet drawer (mobile)
- [ ] Theme-aware Button component with glass glow effect on Glass Purple
- [ ] Theme-aware Card component with backdrop blur on Glass Purple
- [ ] New shadcn/ui components: Sheet, Tooltip, ScrollArea, Popover, Checkbox, Switch
- [ ] Student layout: header-only with theme awareness and toggle
- [ ] Glass background effects (radial gradients, backdrop blur) for Glass Purple theme
- [ ] Aggressive semantic color sweep: replace all hardcoded grays/whites with theme tokens
- [ ] Full SurveyJS theme sync — both themes render assessments natively
- [ ] Transition utilities on interactive elements (hover states, focus rings)
- [ ] Mobile responsive: sidebar collapses to sheet drawer, all pages work on small screens
- [ ] Clean production build with no type errors

### Out of Scope

- 12-theme system from portal — only 2 themes (Daylight + Glass Purple), can expand later
- Cyber/neumorphic effects — only glass effects for Glass Purple theme
- Copying portal theme code — writing fresh to avoid inheriting portal CSS bugs
- AI sidebar, command palette, notification bell — portal-only features
- Student sidebar navigation — students keep header-only layout (only 2 routes)
- Theme per-organization — theme is user preference via localStorage, not org-level

## Context

- **Existing UI:** White header bar with horizontal tabs, no dark mode, no theme system. Functional but visually flat.
- **Sister app (portal):** Has a polished design system with 12 themes, glass/cyber/neu effects, sidebar navigation. Has known CSS issues we want to avoid inheriting.
- **CSS format gap:** Inst currently uses HSL-component CSS variables (`--primary: 221 76% 46%` consumed via `hsl(var(--primary))`). The new theme system needs raw hex values (`--primary: #1b5fd0` consumed via `var(--primary)`). This migration must be atomic.
- **SurveyJS:** Has its own CSS that doesn't respect Tailwind themes. Needs explicit `.dark .sd-root-modern` overrides plus Glass Purple palette sync.
- **Brand color:** `#1b5fd0` (matches existing primary-500 value, so default Daylight appearance stays identical).

## Constraints

- **Atomic CSS migration:** HSL→hex swap in index.css + tailwind.config + all primary-500 class replacements MUST happen in one commit. Any partial state breaks the entire app.
- **SurveyJS compatibility:** The existing `.sd-root-modern` border-color revert block must be preserved. SurveyJS overrides are additive, not replacements.
- **No portal code copy:** Theme system written fresh. Inspired by portal's Glass Purple aesthetic, but independent implementation to avoid inheriting bugs.
- **Existing functionality:** Zero regressions to assessment creation, QR delivery, scoring, attendance, or any admin/student workflows.
- **Build/type clean:** `npm run build` and `npm run typecheck` must pass after every phase.

## Key Decisions

| Decision                  | Rationale                                                              | Outcome   |
| ------------------------- | ---------------------------------------------------------------------- | --------- |
| 2 themes instead of 12    | Portal has CSS issues with many themes; simpler = more reliable        | — Pending |
| Write fresh theme system  | Avoid inheriting portal CSS bugs; cleaner code for 2-theme scope       | — Pending |
| Simple sun/moon toggle    | Only 2 themes don't need a dropdown selector                           | — Pending |
| Aggressive color sweep    | Want full dark mode support, not partial; easier to fix issues now     | — Pending |
| Full SurveyJS theme sync  | Assessments are the core feature; they must look native in both themes | — Pending |
| Student keeps header-only | Students have 2 routes; sidebar adds no value, just complexity         | — Pending |

---

_Last updated: 2026-02-23 after initialization_
