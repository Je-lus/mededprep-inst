# Premium UI Upgrade: mededprep-inst

## What This Is

MedEdPrep Instructor Tools with a polished 2-theme design system (Daylight + Glass Purple), vertical sidebar navigation, frosted glass effects, and theme-aware SurveyJS assessments. The app looks and feels like part of the MedEdPrep product family with full dark mode support across all pages.

## Core Value

The app must look and feel professional across both themes — no broken layouts, no unreadable text, no white flashes when switching themes. Every page, including SurveyJS-rendered assessments, must render correctly in both Daylight and Glass Purple.

## Requirements

### Validated

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
- ✓ Fresh 2-theme system: Daylight (light) and Glass Purple (glass/dark) — v1.0
- ✓ CSS variable migration from HSL components to raw hex values (atomic) — v1.0
- ✓ Tailwind config migration from hsl(var(--xxx)) to var(--xxx) format — v1.0
- ✓ Bulk replacement of primary-500/100/50 shade classes to semantic tokens — v1.0
- ✓ ThemeContext provider with localStorage persistence — v1.0
- ✓ Simple sun/moon theme toggle button (not dropdown) — v1.0
- ✓ Admin sidebar navigation replacing horizontal tab header — v1.0
- ✓ AppShell layout: fixed sidebar (desktop), Sheet drawer (mobile) — v1.0
- ✓ Theme-aware Button component with glass glow effect on Glass Purple — v1.0
- ✓ Theme-aware Card component with backdrop blur on Glass Purple — v1.0
- ✓ New shadcn/ui components: Sheet, Tooltip, ScrollArea, Popover, Checkbox, Switch — v1.0
- ✓ Student layout: header-only with theme awareness and toggle — v1.0
- ✓ Glass background effects (radial gradients, backdrop blur) for Glass Purple theme — v1.0
- ✓ Aggressive semantic color sweep: replace all hardcoded grays/whites with theme tokens — v1.0
- ✓ Full SurveyJS theme sync — both themes render assessments natively — v1.0
- ✓ Transition utilities on interactive elements (hover states, focus rings) — v1.0
- ✓ Mobile responsive: sidebar collapses to sheet drawer, all pages work on small screens — v1.0
- ✓ Clean production build with no type errors — v1.0

### Active

(No active requirements — next milestone will define new scope)

### Out of Scope

- 12-theme system from portal — only 2 themes (Daylight + Glass Purple); can expand later
- Cyber/neumorphic effects — only glass effects for Glass Purple theme
- Copying portal theme code — writing fresh avoided inheriting portal CSS bugs
- AI sidebar, command palette, notification bell — portal-only features
- Student sidebar navigation — students keep header-only layout (only 2 routes)
- Theme per-organization — theme is user preference via localStorage, not org-level
- SurveyJS Creator dark mode — separate CSS bundle, hundreds of internal classes, low instructor value
- Animated background particles — GPU-heavy, causes jank on student Chromebooks
- CSS animation on backdrop-filter — performance trap confirmed by NN/G; box-shadow used instead

## Context

Shipped v1.0 Premium UI Upgrade with 49,622 LOC (TS/TSX/CSS).
Tech stack: Express 5, Prisma 5, PostgreSQL, React 19, TanStack Query v5, shadcn/ui, Tailwind v3, Zustand, SurveyJS.
CSS variables use raw hex format (`var(--primary)` resolves to `#1b5fd0`).
Theme system: ThemeContext + FOUC prevention script + `data-theme` attribute on `<html>`.
Admin layout: AppShell with fixed sidebar (desktop) + Sheet drawer (mobile).
Known limitation: Tailwind v3 opacity modifiers (`bg-primary/50`) no-op with hex CSS vars; Glass Purple CSS handles hover effects separately.

## Constraints

- **SurveyJS compatibility:** The `.sd-root-modern` border-color revert block must be preserved. SurveyJS overrides are additive, not replacements.
- **No portal code copy:** Theme system written fresh. Independent implementation avoids inheriting portal bugs.
- **Existing functionality:** Zero regressions to assessment creation, QR delivery, scoring, attendance, or any admin/student workflows.
- **Build/type clean:** `npm run build` and `npm run typecheck` must pass after every phase.

## Key Decisions

| Decision                   | Rationale                                                              | Outcome    |
| -------------------------- | ---------------------------------------------------------------------- | ---------- |
| 2 themes instead of 12     | Portal has CSS issues with many themes; simpler = more reliable        | ✓ Good     |
| Write fresh theme system   | Avoid inheriting portal CSS bugs; cleaner code for 2-theme scope       | ✓ Good     |
| Simple sun/moon toggle     | Only 2 themes don't need a dropdown selector                           | ✓ Good     |
| Aggressive color sweep     | Want full dark mode support, not partial; easier to fix issues now     | ✓ Good     |
| Full SurveyJS theme sync   | Assessments are the core feature; they must look native in both themes | ✓ Good     |
| Student keeps header-only  | Students have 2 routes; sidebar adds no value, just complexity         | ✓ Good     |
| Atomic HSL→hex migration   | Any partial state breaks every semantic color in the app               | ✓ Good     |
| CSS-only glass effects     | data-theme selectors in CSS, no inline JSX conditionals needed         | ✓ Good     |
| Lazy useState for theme    | Synchronous init prevents FOUC from React side                         | ✓ Good     |
| glass-card always present  | Inert in Daylight, activated by CSS selector in Glass Purple           | ✓ Good     |
| Opacity modifiers accepted | bg-primary/50 no-op with hex in Tailwind v3; Phase 4 CSS compensates   | ⚠️ Revisit |

---

_Last updated: 2026-02-24 after v1.0 milestone_
