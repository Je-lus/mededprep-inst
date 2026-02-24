# Requirements: Premium UI Upgrade

**Defined:** 2026-02-23
**Core Value:** The app must look and feel professional across both themes — no broken layouts, no unreadable text, no white flashes when switching themes.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### CSS Foundation

- [x] **CSS-01**: CSS variables migrate from HSL-component format to raw hex format atomically (index.css + tailwind.config + all primary-500 class references in one commit)
- [x] **CSS-02**: Tailwind config switches from `hsl(var(--xxx))` to `var(--xxx)` consumption pattern for all color tokens
- [x] **CSS-03**: All `primary-500` / `primary-100` / `primary-50` / `primary-600` / `primary-700` utility class references replaced with semantic equivalents (`bg-primary`, `bg-primary/10`, etc.)
- [x] **CSS-04**: Global `border-color` rule in index.css switches from `hsl(var(--border))` to `var(--border)`
- [x] **CSS-05**: Glass Purple CSS variables defined under `[data-theme="glass"]` selector with dark background, purple accent, and rgba surface colors
- [x] **CSS-06**: Daylight CSS variables defined under `:root` selector matching current light appearance (no visual regression)

### Theme Infrastructure

- [x] **THM-01**: ThemeContext provider exposes `theme` state and `setTheme` function via React context
- [x] **THM-02**: Theme persists to localStorage and loads on initialization without server round-trip
- [x] **THM-03**: FOUC prevention inline script in index.html sets `data-theme` attribute on `<html>` before React mounts
- [x] **THM-04**: System preference detection on first visit — users with `prefers-color-scheme: dark` get Glass Purple automatically
- [x] **THM-05**: Sun/Moon toggle button switches between Daylight and Glass Purple themes
- [x] **THM-06**: Toggle placed in admin sidebar header and student page header

### Admin Layout

- [x] **LAY-01**: Admin sidebar navigation with links: Dashboard, Assessments, Question Banks, Attendance, Students, Bug Reports, Instructors (owner-only)
- [x] **LAY-02**: Sidebar fixed left (w-64) on desktop, hidden on mobile
- [x] **LAY-03**: Mobile sidebar rendered as Sheet drawer from left with hamburger toggle
- [x] **LAY-04**: AppShell layout: sidebar + header + scrollable main content area with md:pl-64 offset
- [x] **LAY-05**: Existing AdminLayout.tsx replaced by AppShell — all admin routes work through new layout
- [x] **LAY-06**: Glass Purple body background: radial gradient from purple-dark tones
- [x] **LAY-07**: Glass sidebar: backdrop-filter blur(16px) with semi-transparent background in Glass Purple
- [x] **LAY-08**: Active nav item: glass glow indicator in Glass Purple, simple primary highlight in Daylight

### Components

- [ ] **CMP-01**: Button component uses semantic color tokens; primary variant works in both themes
- [ ] **CMP-02**: Card component uses semantic color tokens; renders correctly in both themes
- [ ] **CMP-03**: New shadcn/ui components installed: Sheet, Tooltip, ScrollArea, Popover, Checkbox, Switch
- [ ] **CMP-04**: Glass card backdrop blur in Glass Purple: blur(12px) + rgba surface + subtle border
- [ ] **CMP-05**: Primary button glow effect in Glass Purple: purple box-shadow on hover
- [ ] **CMP-06**: Smooth color transition on theme switch (background-color 0.25s, color 0.15s on body and sidebar)

### SurveyJS

- [ ] **SJS-01**: TakeAssessment page reads current theme from ThemeContext
- [ ] **SJS-02**: SurveyJS `model.applyTheme()` called with dark colorPalette and custom `--sjs-*` variables when Glass Purple is active
- [ ] **SJS-03**: SurveyJS renders with purple primary color, dark backgrounds, and light text in Glass Purple
- [ ] **SJS-04**: Existing `.sd-root-modern` border-color revert block preserved through migration
- [ ] **SJS-05**: Daylight theme SurveyJS appearance matches current behavior (no regression)

### Color Sweep

- [ ] **CLR-01**: All hardcoded `bg-white` in layout/card contexts replaced with `bg-background` or `bg-card`
- [ ] **CLR-02**: All hardcoded `bg-gray-50` / `bg-gray-100` replaced with `bg-muted` or `bg-background`
- [ ] **CLR-03**: All hardcoded `text-gray-*` / `text-slate-*` replaced with `text-foreground` or `text-muted-foreground`
- [ ] **CLR-04**: All hardcoded `border-gray-*` / `border-slate-*` replaced with `border-border`
- [ ] **CLR-05**: StatusBadge component uses theme-aware colors
- [ ] **CLR-06**: BugReportButton/BugReportDialog use theme-aware colors
- [ ] **CLR-07**: ToggleSwitch uses theme-aware colors
- [ ] **CLR-08**: Intentional whites preserved (QR code backgrounds, print contexts)
- [ ] **CLR-09**: Post-sweep grep confirms zero remaining hardcoded gray/white/slate references in component/page files

### Student Layout

- [ ] **STU-01**: StudentLayout upgraded with ThemeContext integration
- [ ] **STU-02**: Glass Purple background effects applied to student pages
- [ ] **STU-03**: Theme toggle (sun/moon) in student header
- [ ] **STU-04**: Theme persists across admin and student sides (shared localStorage key)

### Quality

- [ ] **QAL-01**: `npm run build` passes clean after every phase
- [ ] **QAL-02**: `npm run typecheck` passes after every phase
- [ ] **QAL-03**: Visual test: admin dashboard, assessment creation, take-assessment flow in both themes
- [ ] **QAL-04**: Mobile test: sidebar collapses to sheet, all pages responsive
- [ ] **QAL-05**: No white flashes on page load or navigation in Glass Purple

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Extended Theming

- **EXT-01**: Per-organization theme preference (DB schema + admin UI)
- **EXT-02**: SurveyJS Creator (admin editor) dark mode
- **EXT-03**: Third theme option (high-contrast accessibility)
- **EXT-04**: Custom color picker for user-defined themes

## Out of Scope

| Feature                               | Reason                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| 12-theme system from portal           | Only 2 themes needed; simpler = more reliable                                       |
| Cyber/neumorphic effects              | Only glass effects for Glass Purple theme                                           |
| Portal code copy                      | Writing fresh to avoid inheriting portal CSS bugs                                   |
| SurveyJS Creator dark mode            | Separate CSS bundle, hundreds of internal classes to override, low instructor value |
| Animated background particles         | GPU-heavy, causes jank on student Chromebooks                                       |
| CSS animation on backdrop-filter      | Performance trap confirmed by NN/G; use box-shadow instead                          |
| Three-way toggle (light/dark/system)  | System preference detected silently; sun/moon toggle sufficient                     |
| View Transitions API for theme switch | Not baseline; fallback complexity outweighs visual benefit                          |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| CSS-01      | Phase 1 | Complete |
| CSS-02      | Phase 1 | Complete |
| CSS-03      | Phase 1 | Complete |
| CSS-04      | Phase 1 | Complete |
| CSS-05      | Phase 1 | Complete |
| CSS-06      | Phase 1 | Complete |
| THM-01      | Phase 2 | Complete |
| THM-02      | Phase 2 | Complete |
| THM-03      | Phase 2 | Complete |
| THM-04      | Phase 2 | Complete |
| THM-05      | Phase 2 | Complete |
| THM-06      | Phase 2 | Complete |
| LAY-01      | Phase 3 | Complete |
| LAY-02      | Phase 3 | Complete |
| LAY-03      | Phase 3 | Complete |
| LAY-04      | Phase 3 | Complete |
| LAY-05      | Phase 3 | Complete |
| LAY-06      | Phase 3 | Complete |
| LAY-07      | Phase 3 | Complete |
| LAY-08      | Phase 3 | Complete |
| CMP-01      | Phase 4 | Pending  |
| CMP-02      | Phase 4 | Pending  |
| CMP-03      | Phase 4 | Pending  |
| CMP-04      | Phase 4 | Pending  |
| CMP-05      | Phase 4 | Pending  |
| CMP-06      | Phase 4 | Pending  |
| SJS-01      | Phase 5 | Pending  |
| SJS-02      | Phase 5 | Pending  |
| SJS-03      | Phase 5 | Pending  |
| SJS-04      | Phase 5 | Pending  |
| SJS-05      | Phase 5 | Pending  |
| CLR-01      | Phase 5 | Pending  |
| CLR-02      | Phase 5 | Pending  |
| CLR-03      | Phase 5 | Pending  |
| CLR-04      | Phase 5 | Pending  |
| CLR-05      | Phase 5 | Pending  |
| CLR-06      | Phase 5 | Pending  |
| CLR-07      | Phase 5 | Pending  |
| CLR-08      | Phase 5 | Pending  |
| CLR-09      | Phase 5 | Pending  |
| STU-01      | Phase 5 | Pending  |
| STU-02      | Phase 5 | Pending  |
| STU-03      | Phase 5 | Pending  |
| STU-04      | Phase 5 | Pending  |
| QAL-01      | Phase 5 | Pending  |
| QAL-02      | Phase 5 | Pending  |
| QAL-03      | Phase 5 | Pending  |
| QAL-04      | Phase 5 | Pending  |
| QAL-05      | Phase 5 | Pending  |

**Coverage:**

- v1 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0 ✓

---

_Requirements defined: 2026-02-23_
_Last updated: 2026-02-24 after roadmap creation — all 49 requirements mapped_
