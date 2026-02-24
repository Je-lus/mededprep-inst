# Phase 5: SurveyJS Sync, Color Sweep & Student Layout - Research

**Researched:** 2026-02-24
**Domain:** SurveyJS theming API, semantic color sweep, React context consumption
**Confidence:** HIGH

---

## Summary

Phase 5 is the final polish pass for the Premium UI Upgrade. It has three distinct sub-problems: (1) making the SurveyJS player respect the active theme, (2) upgrading the StudentLayout to use ThemeContext and render Glass Purple effects, and (3) conducting a systematic semantic color sweep across every source file to eliminate all hardcoded gray/white/slate/primary-500 classes. Each sub-problem is independent once ThemeContext exists from Phase 2.

The SurveyJS work is straightforward: `model.applyTheme()` accepts an `ITheme` object with `colorPalette: "dark"` plus a `cssVariables` map. The key variables to override are `--sjs-general-backcolor` (survey outer background), `--sjs-general-backcolor-dim` (page container dim), `--sjs-general-forecolor` (primary text), and `--sjs-primary-backcolor` (buttons/highlights). The existing `model.applyTheme()` call in TakeAssessment already sets the brand primary variables — Phase 5 adds conditional dark-mode variables when the theme is Glass Purple.

The color sweep is mechanical but must be systematic. A full grep audit found **109 hardcoded color references across 36 source files**. The vast majority are `primary-500` class usages (should become `bg-primary`/`text-primary`) or structural `bg-gray-*`/`text-gray-*` references (should become semantic tokens). Intentional whites — QR code container backgrounds, score circle in AssessmentResults, ToggleSwitch thumb — must be preserved with code comments.

**Primary recommendation:** Execute this phase in three distinct waves: (A) SurveyJS theme sync in TakeAssessment, (B) StudentLayout upgrade, (C) color sweep across all files in a single logical commit. The color sweep is the largest wave and benefits from file-by-file systematic treatment rather than mass find-replace, to avoid incorrectly replacing intentional whites.

---

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                                                | Research Support                                                                                                                                                                                                                    |
| ------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SJS-01 | TakeAssessment page reads current theme from ThemeContext                                                  | ThemeContext built in Phase 2; add `useTheme()` hook call in TakeAssessment, conditionally pass dark cssVariables to `model.applyTheme()`                                                                                           |
| SJS-02 | `model.applyTheme()` called with dark colorPalette and custom `--sjs-*` variables when Glass Purple active | Confirmed: `applyTheme({ colorPalette: "dark", cssVariables: {...} })` is the correct API (ITheme interface from survey-core/typings/src/themes.d.ts line 24)                                                                       |
| SJS-03 | SurveyJS renders with purple primary color, dark backgrounds, and light text in Glass Purple               | CSS variables `--sjs-general-backcolor`, `--sjs-general-backcolor-dim`, `--sjs-general-forecolor`, `--sjs-primary-backcolor` control these exactly                                                                                  |
| SJS-04 | Existing `.sd-root-modern` border-color revert block preserved through migration                           | This block is in index.css, not in any component — phase has zero risk of touching it unless index.css is modified                                                                                                                  |
| SJS-05 | Daylight theme SurveyJS appearance matches current behavior (no regression)                                | Daylight path: pass existing brand-only theme object (no colorPalette, no dark backgrounds), identical to current code                                                                                                              |
| CLR-01 | All `bg-white` in layout/card contexts replaced with `bg-background` or `bg-card`                          | 9 layout-context bg-white found; QR code contexts preserved separately                                                                                                                                                              |
| CLR-02 | All `bg-gray-50`/`bg-gray-100` replaced with `bg-muted` or `bg-background`                                 | Found across 7 files: Login, Welcome, AttendSession, CheckOutSession, BugReports (bg-gray-50), SessionList/SessionDetail (bg-gray-100)                                                                                              |
| CLR-03 | All `text-gray-*`/`text-slate-*` replaced with `text-foreground` or `text-muted-foreground`                | Found in 15+ files; text-gray-600/500 → text-muted-foreground, text-gray-900/text-slate-900 → text-foreground                                                                                                                       |
| CLR-04 | All `border-gray-*`/`border-slate-*` replaced with `border-border`                                         | Found in ItemAnalysisTab, AssessmentReview — 3 occurrences                                                                                                                                                                          |
| CLR-05 | StatusBadge uses theme-aware colors                                                                        | StatusBadge uses `bg-primary-500 text-white` — replace with `bg-primary text-primary-foreground`                                                                                                                                    |
| CLR-06 | BugReportButton/BugReportDialog use theme-aware colors                                                     | BugReportButton: `bg-primary-500` → `bg-primary`; BugReportDialog: `text-gray-500` → `text-muted-foreground`, submit button `bg-primary-500` → `bg-primary`                                                                         |
| CLR-07 | ToggleSwitch uses theme-aware colors                                                                       | ToggleSwitch: `bg-white` wrapper → `bg-card`, track `peer-checked:bg-primary-500` → `peer-checked:bg-primary`, thumb `after:bg-white` → intentional (thumb stays white — that's a design element, not a background)                 |
| CLR-08 | Intentional whites preserved (QR code backgrounds, print contexts)                                         | Identified 4 intentional whites: QrCodeTab img container, QrPresenter card + QR container, AssessmentResults score circle, ToggleSwitch thumb — each needs a `/* intentional */` comment                                            |
| CLR-09 | Post-sweep grep confirms zero remaining hardcoded references                                               | Verification step: `grep -r "bg-white\|bg-gray-\|text-gray-\|border-gray-\|text-slate-\|border-slate-\|primary-50\b\|primary-100\b\|primary-500\b" app/src --include="*.tsx" --include="*.ts"` returns only intentional-white lines |
| STU-01 | StudentLayout upgraded with ThemeContext integration                                                       | StudentLayout uses `bg-background` on body already; needs ThemeContext provider wrap and header semantic color fixes                                                                                                                |
| STU-02 | Glass Purple background effects applied to student pages                                                   | StudentLayout body div: add Glass Purple radial gradient via `data-theme` attribute — same CSS variable approach used in AppShell from Phase 3                                                                                      |
| STU-03 | Theme toggle (sun/moon) in student header                                                                  | Add ThemeToggle component (built in Phase 2) to StudentLayout header nav                                                                                                                                                            |
| STU-04 | Theme persists across admin and student sides                                                              | Both sides read/write the same `localStorage` key — shared by ThemeContext from Phase 2; no extra work needed if Phase 2 is correct                                                                                                 |
| QAL-01 | `npm run build` passes clean after every phase                                                             | Build command: `cd app && npm run build` — no new packages needed, no TypeScript changes that would break types                                                                                                                     |
| QAL-02 | `npm run typecheck` passes after every phase                                                               | All replacements are string class changes; no runtime type changes                                                                                                                                                                  |
| QAL-03 | Visual test: admin dashboard, assessment creation, take-assessment flow in both themes                     | Manual verification in browser — both Daylight and Glass Purple                                                                                                                                                                     |
| QAL-04 | Mobile test: sidebar collapses to sheet, all pages responsive                                              | Manual verification                                                                                                                                                                                                                 |
| QAL-05 | No white flashes on page load or navigation in Glass Purple                                                | FOUC prevention inline script from Phase 2 covers this; student layout must also not have hardcoded bg-white on body                                                                                                                |

</phase_requirements>

---

## Standard Stack

### Core

| Library         | Version | Purpose                                | Why Standard                                                      |
| --------------- | ------- | -------------------------------------- | ----------------------------------------------------------------- |
| survey-core     | 2.5.10  | SurveyJS model — `applyTheme()` method | Already installed; `ITheme` interface is the official theming API |
| survey-react-ui | 2.5.10  | `<Survey model={...}>` React component | Already in use in TakeAssessment                                  |
| React Context   | 19.1.0  | ThemeContext (built in Phase 2)        | No new packages — consume existing context                        |

### Supporting

| Library        | Version | Purpose        | When to Use                                       |
| -------------- | ------- | -------------- | ------------------------------------------------- |
| tailwind-merge | 3.3.0   | `cn()` utility | When class replacements involve conditional logic |

### Alternatives Considered

| Instead of                             | Could Use                                          | Tradeoff                                                                                                       |
| -------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `model.applyTheme()` with dark palette | CSS custom property injection on `.sd-root-modern` | SurveyJS may reset inline styles on re-render; `applyTheme()` is the documented API and persists properly      |
| Replacing `bg-white` everywhere        | Creating a Tailwind alias                          | Aliases add config complexity; semantic Tailwind tokens (`bg-background`, `bg-card`) are already in the config |

**Installation:** No new packages needed for Phase 5.

---

## Architecture Patterns

### Recommended Project Structure

```
app/src/
├── contexts/
│   └── ThemeContext.tsx         # Built in Phase 2 — provides useTheme()
├── components/
│   ├── StudentLayout.tsx        # Add ThemeContext + toggle + Glass Purple body
│   ├── StatusBadge.tsx          # bg-primary-500 → bg-primary
│   ├── BugReportButton.tsx      # bg-primary-500 → bg-primary
│   ├── BugReportDialog.tsx      # text-gray-500 → text-muted-foreground, bg-primary-500 → bg-primary
│   └── ToggleSwitch.tsx         # bg-white → bg-card, primary-500 → primary
├── pages/public/
│   └── TakeAssessment.tsx       # Add useTheme(), conditional applyTheme with dark vars
└── [all other files]            # Color sweep only — no structural changes
```

### Pattern 1: Conditional SurveyJS Theme Application

**What:** Read the active theme from ThemeContext, call `model.applyTheme()` with different arguments depending on the active theme
**When to use:** When creating the SurveyJS model in TakeAssessment (inside `handleStart`)
**Example:**

```typescript
// In TakeAssessment.tsx — inside handleStart() after `const model = new Model(parsedSurvey);`
// ThemeContext is built in Phase 2 and exposes: { theme: 'daylight' | 'glass' }
const { theme } = useTheme();

const glassPurpleTheme: ITheme = {
  colorPalette: 'dark',
  cssVariables: {
    '--sjs-primary-backcolor': '#7c3aed', // Glass Purple primary (violet-700)
    '--sjs-primary-backcolor-light': 'rgba(124, 58, 237, 0.1)',
    '--sjs-primary-backcolor-dark': '#6d28d9', // violet-800
    '--sjs-primary-forecolor': '#ffffff',
    '--sjs-general-backcolor': '#1a0a2e', // deep purple-dark
    '--sjs-general-backcolor-dim': '#150826', // page container dimmer
    '--sjs-general-backcolor-dim-light': '#1e0d35',
    '--sjs-general-forecolor': 'rgba(255, 255, 255, 0.91)',
    '--sjs-general-forecolor-light': 'rgba(255, 255, 255, 0.55)',
  },
};

const daylightTheme: ITheme = {
  cssVariables: {
    '--sjs-primary-backcolor': '#1b5fd0',
    '--sjs-primary-backcolor-light': 'rgba(27, 95, 208, 0.1)',
    '--sjs-primary-backcolor-dark': '#1550b5',
    '--sjs-primary-forecolor': '#ffffff',
  },
};

model.applyTheme(theme === 'glass' ? glassPurpleTheme : daylightTheme);
```

**Critical notes on `colorPalette: "dark"`:**

- Setting `colorPalette: "dark"` with no `cssVariables` gives SurveyJS's built-in dark theme (greenish defaults). You MUST supply your own `cssVariables` to override the color defaults.
- The `colorPalette` property switches the dark-mode CSS class on the `.sd-root-modern` container. The survey-core CSS uses fallback chaining: `var(--sjs-general-backcolor, var(--background, #fff))` — so setting `--sjs-general-backcolor` in cssVariables overrides the default.
- The existing `.sd-root-modern * { border-color: revert; }` block in index.css must remain untouched (SJS-04).

**Important:** `useTheme()` in TakeAssessment is a hook — the theme value is captured at component render time, but `handleStart` is an async event handler. The simplest approach is to capture `theme` at component top level and reference it via a ref inside the async callback, or read the theme at the point `model.applyTheme()` is called (theme value won't change mid-handler).

### Pattern 2: Semantic Color Replacement Map

**What:** The standard mapping from hardcoded Tailwind utility classes to semantic equivalents
**When to use:** During color sweep — every file identified in the grep audit

```
BACKGROUND REPLACEMENTS:
  bg-white         → bg-background  (page backgrounds, card-like contexts)
  bg-white         → bg-card        (card/panel surfaces inside layouts)
  bg-gray-50       → bg-background  (page-level backgrounds)
  bg-gray-100      → bg-muted       (inactive states, table row backgrounds)
  bg-gray-200      → bg-muted       (progress bars, low-emphasis backgrounds)
  bg-gray-400      → bg-muted-foreground (only in badge — use semantic muted)

TEXT REPLACEMENTS:
  text-gray-900    → text-foreground
  text-slate-900   → text-foreground
  text-gray-700    → text-foreground (or text-muted-foreground depending on context)
  text-slate-700   → text-muted-foreground
  text-gray-600    → text-muted-foreground
  text-slate-600   → text-muted-foreground
  text-gray-500    → text-muted-foreground
  text-slate-500   → text-muted-foreground

BORDER REPLACEMENTS:
  border-gray-200  → border-border
  border-gray-300  → border-border
  border-slate-200 → border-border
  border-slate-300 → border-border (EXCEPTION: QrPresenter's border-slate-300 on Card — intentional since it's a presenter-mode card that must be readable on dark bg-slate-950)

PRIMARY COLOR REPLACEMENTS:
  bg-primary-500   → bg-primary
  text-primary-500 → text-primary
  border-primary-500 → border-primary
  hover:bg-primary-500/90 → hover:bg-primary/90
  bg-primary-500/10 → bg-primary/10
  primary-50       → bg-primary/5   (if used as opacity variant)
  primary-100      → bg-primary/10  (if used as opacity variant)
```

### Pattern 3: StudentLayout ThemeContext Integration

**What:** Wrap StudentLayout's body div with Glass Purple body gradient, add toggle to header
**When to use:** STU-01 through STU-04
**Example:**

```typescript
// StudentLayout.tsx — the body and header changes
import { useTheme } from '@/contexts/ThemeContext';
// ThemeToggle is built in Phase 2

export default function StudentLayout() {
  const { theme } = useTheme();
  // ... existing code ...

  return (
    // ThemeContext is provided at App level (from Phase 2), so no extra Provider needed here
    <div className="min-h-screen bg-background">
      {/* Skip link unchanged */}
      <header className="sticky top-0 z-10 border-b bg-card">
        <nav ...>
          {/* existing nav content */}
          <div className="flex items-center gap-3">
            {/* existing user name and logout */}
            <ThemeToggle />   {/* ADD: sun/moon toggle */}
          </div>
        </nav>
      </header>
      {/* rest unchanged */}
    </div>
  );
}
```

**Note on bg-background vs bg-card for StudentLayout header:**
StudentLayout's `<header>` currently has `bg-white`. In the admin AppShell (Phase 3), the sidebar and header use the glass effect classes. For the student header, using `bg-card` gives the card surface color (translucent in Glass Purple if Phase 3/4 applied `--card` as rgba), matching the admin header treatment.

### Anti-Patterns to Avoid

- **Replacing ALL `bg-white` blindly:** QR code image containers (`bg-white p-2`, `bg-white p-4`), score circle in AssessmentResults, ToggleSwitch thumb (`after:bg-white`) and the QrPresenter Card (`bg-white text-slate-900`) are ALL intentional. Replace only layout/surface contexts.
- **Replacing `bg-slate-950` in QrPresenter:** This is an intentional near-black background for presenter mode. It is NOT in the grep pattern list (`bg-slate-950` is not `bg-slate-*` as per the requirement grep) but adjacent `bg-slate-100` and `text-slate-*` classes in QrPresenter are also intentional (the entire card is forced light-mode on dark backdrop). QrPresenter is a special case — mark all its slate classes with `/* intentional: presenter mode */`.
- **Calling `applyTheme()` on re-renders:** The theme is applied once at model creation in `handleStart`. Do NOT call `applyTheme()` in a `useEffect` that watches theme changes — this would require tracking the model across React lifecycle and is fragile. If a user switches theme mid-assessment, that edge case is acceptable (the SurveyJS player retains its theme for the session duration).
- **Using Tailwind `primary-600`/`primary-700` as substitutes:** These are numeric scale classes that will be removed by Phase 1. Replace with semantic tokens only.
- **Breaking the BugReports color-coded severity/category badges:** The `bg-red-100`, `bg-blue-100`, `bg-gray-400`, `bg-orange-500`, etc. in BugReports badge variants serve as semantic status indicators. `bg-gray-400` for "low" severity should become `bg-muted-foreground` or remain if it's intentional neutral gray — check readability against Glass Purple `text-foreground`.

---

## Don't Hand-Roll

| Problem                           | Don't Build                                             | Use Instead                                                              | Why                                                                                                           |
| --------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| SurveyJS dark mode                | Custom CSS overrides targeting internal `.sd-*` classes | `model.applyTheme({ colorPalette: "dark", cssVariables: {...} })`        | The `--sjs-*` variable cascade in survey-core.css is designed for this; class overrides fight CSS specificity |
| Theme detection in TakeAssessment | Reading `localStorage` directly                         | `useTheme()` from ThemeContext                                           | Avoids duplication; ThemeContext handles system preference, FOUC, and updates                                 |
| Color token mapping               | Custom Tailwind plugin                                  | Existing `bg-background`, `bg-card`, `bg-muted`, etc. in tailwind.config | These are already configured from Phase 1                                                                     |

**Key insight:** SurveyJS's `applyTheme()` writes CSS variables directly to the survey's root DOM element, which means the variables are scoped to the survey and don't leak into the surrounding page. This is exactly the right approach — the page's theme variables remain under Tailwind/ThemeContext control.

---

## Common Pitfalls

### Pitfall 1: useTheme Hook in Async Event Handler

**What goes wrong:** `handleStart` in TakeAssessment is an async function. The `theme` value from `useTheme()` must be captured at component render time, not inside the async callback. Calling hooks inside async functions is a React rules violation.
**Why it happens:** `model.applyTheme()` is called inside `handleStart`, which is deep inside an event handler, not at the component's top level.
**How to avoid:** Call `const { theme } = useTheme()` at the top of the `TakeAssessment` component (not inside `handleStart`). The value is a primitive string — closure capture works correctly.
**Warning signs:** ESLint's `rules-of-hooks` plugin will flag any hook call inside `handleStart` immediately.

### Pitfall 2: SurveyJS applyTheme Color Mismatch

**What goes wrong:** Setting `colorPalette: "dark"` without overriding `--sjs-primary-backcolor` gives SurveyJS's default green (#19b394) primary color in dark mode, not the app's purple.
**Why it happens:** `colorPalette: "dark"` switches the dark palette defaults — the SurveyJS default dark theme uses green primary.
**How to avoid:** Always override ALL the primary color variables when switching to dark: `--sjs-primary-backcolor`, `--sjs-primary-backcolor-light`, `--sjs-primary-backcolor-dark`, `--sjs-primary-forecolor`.

### Pitfall 3: Color Sweep Missing Context7 Non-Gray Colors

**What goes wrong:** The grep pattern misses `bg-blue-50`, `bg-amber-50`, `bg-emerald-50`, `bg-purple-50` which are hardcoded semantic colors in StudentDashboard stats cards and AssessmentReview answer indicators. These are NOT in the CLR-01 through CLR-09 sweep patterns.
**Why it happens:** The requirement grep only targets gray/white/slate/primary — the colored semantic indicators (blue for info, amber for warning, emerald for success) are intentional and excluded.
**How to avoid:** Do NOT replace `bg-blue-50`, `bg-amber-50`, `bg-emerald-50`, `bg-emerald-600` etc. These are intentional status colors. The success criteria only grep for the specific patterns listed.

### Pitfall 4: QrPresenter Intentional White Card

**What goes wrong:** QrPresenter has `bg-white text-slate-900` on its card — this is intentional because the presenter mode renders on a `bg-slate-950` background. The card must remain visually white-on-dark for legibility in a classroom projector context.
**Why it happens:** The grep will flag `bg-white` in QrPresenter, and a mechanical replacement would break the presenter experience.
**How to avoid:** Add `/* intentional: presenter mode card, must remain white on dark bg */` comment and confirm with CLR-08 requirement that presenter mode is a preserved context.

### Pitfall 5: ToggleSwitch Thumb vs. Wrapper

**What goes wrong:** ToggleSwitch has TWO `bg-white` uses: the outer `<label>` wrapper (`bg-white`) and the thumb (`after:bg-white`). The wrapper should become `bg-card`; the thumb is an intentional white circle that should stay white (it contrasts against the track color).
**Why it happens:** Both appear in the same grep hit and could both be replaced mechanically.
**How to avoid:** Replace only the wrapper `bg-white` with `bg-card`. Mark the thumb `after:bg-white` as `/* intentional: toggle thumb */`.

### Pitfall 6: ThemeContext Not Yet Wrapping TakeAssessment

**What goes wrong:** TakeAssessment is a public route mounted outside any auth context. Phase 2's ThemeContext must be provided at the App level (wrapping all routes), not inside the admin ProtectedRoute.
**Why it happens:** If Phase 2 only wrapped ThemeContext around admin routes, public routes like TakeAssessment won't have access to `useTheme()`.
**How to avoid:** Verify in App.tsx that ThemeContext.Provider wraps the entire `<Routes>` tree, not just the admin subtree. If Phase 2 was done correctly per the requirements, this is already the case.

---

## Code Examples

Verified patterns from official sources:

### SurveyJS applyTheme with Dark Palette

```typescript
// Source: survey-core/typings/src/themes.d.ts — ITheme interface
// Source: survey-core/survey-core.css — variable fallback cascade

import { Model } from 'survey-core';
import type { ITheme } from 'survey-core'; // ITheme is exported from survey-core

const glassPurpleTheme: ITheme = {
  colorPalette: 'dark', // switches .sd-root-modern to dark variant
  cssVariables: {
    '--sjs-primary-backcolor': '#7c3aed',
    '--sjs-primary-backcolor-light': 'rgba(124, 58, 237, 0.1)',
    '--sjs-primary-backcolor-dark': '#6d28d9',
    '--sjs-primary-forecolor': '#ffffff',
    '--sjs-general-backcolor': '#1a0a2e',
    '--sjs-general-backcolor-dim': '#150826',
    '--sjs-general-backcolor-dim-light': '#1e0d35',
    '--sjs-general-forecolor': 'rgba(255, 255, 255, 0.91)',
    '--sjs-general-forecolor-light': 'rgba(255, 255, 255, 0.55)',
  },
};

model.applyTheme(glassPurpleTheme);
```

### ITheme TypeScript Import

```typescript
// survey-core exports ITheme as a named export
import { Model } from 'survey-core';
import type { ITheme } from 'survey-core';
```

### SurveyJS Variable Cascade (confirmed from survey-core.css lines 483–491)

The CSS uses a fallback chain:

```css
/* Each --sjs-* variable falls back to a shorter alias, then a default */
background-color: var(--sjs-general-backcolor, var(--background, #fff));
color: var(--sjs-general-forecolor, var(--foreground, #161616));
fill: var(--sjs-primary-backcolor, var(--primary, #19b394));
```

This means overriding `--sjs-general-backcolor` via `cssVariables` takes full effect.

### Semantic Class Replacement Examples

```tsx
// StatusBadge — before
<Badge className="bg-primary-500 text-white hover:bg-primary-500">Active</Badge>
// StatusBadge — after
<Badge className="bg-primary text-primary-foreground hover:bg-primary/90">Active</Badge>

// BugReportButton — before
className="... bg-primary-500 hover:bg-primary-500/90"
// BugReportButton — after
className="... bg-primary hover:bg-primary/90"

// ToggleSwitch wrapper — before
<label className="... bg-white ...">
// ToggleSwitch wrapper — after
<label className="... bg-card ...">

// ToggleSwitch track — before
"... peer-checked:bg-primary-500 ..."
// ToggleSwitch track — after
"... peer-checked:bg-primary ..."

// StudentLayout header — before
<header className="sticky top-0 z-10 border-b bg-white">
// StudentLayout header — after
<header className="sticky top-0 z-10 border-b bg-card">

// TakeAssessment save status — before
className="... text-gray-600"
// TakeAssessment save status — after
className="... text-muted-foreground"
```

### QR Code Intentional White Preservation

```tsx
// QrCodeTab.tsx — preserve with comment
<img
  src={qrData.qrCode}
  alt="Assessment QR code"
  className="mx-auto h-[300px] w-[300px] rounded border bg-white p-2" // intentional: QR readability requires white background
/>

// AssessmentResults score circle — preserve with comment
className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 bg-white ${scoreBorderColor(...)}`} // intentional: score circle visual design
```

---

## State of the Art

| Old Approach                                             | Current Approach                                       | When Changed                            | Impact                                                             |
| -------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------ |
| SurveyJS themed via class overrides on `.sd-root-modern` | `model.applyTheme({ colorPalette, cssVariables })` API | SurveyJS 1.9+ introduced, stable in 2.x | All theming through official API, no fighting CSS specificity      |
| `primary-500` utility classes (Tailwind numeric scale)   | `bg-primary` (semantic token)                          | Phase 1 migration                       | After Phase 1, `primary-500` Tailwind class is removed from config |

**Deprecated/outdated:**

- `bg-primary-500` class: Removed in Phase 1 — after Phase 1, this class will not resolve to any color. Phase 5 finalizes removal of any stragglers.
- `hsl(var(--primary))` in Tailwind config: Replaced in Phase 1 with raw hex format.

---

## File-by-File Sweep Map

### Files with structural bg-white/bg-gray replacements (layout context)

| File                                                             | Issues                                                                                                                                  | Action                                                                                                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `app/src/components/AdminLayout.tsx`                             | `bg-gray-50`, `bg-white` (header), `border-primary-500`, `text-primary-500` (9 hits)                                                    | Will be fully replaced by AppShell in Phase 3 — confirm if still needed post-Phase 3                                                 |
| `app/src/components/StudentLayout.tsx`                           | `bg-white` (header) — 1 hit                                                                                                             | → `bg-card`                                                                                                                          |
| `app/src/components/ToggleSwitch.tsx`                            | `bg-white` (wrapper), `peer-checked:bg-primary-500`, `after:bg-white` (thumb)                                                           | Wrapper → `bg-card`, track → `bg-primary`, thumb preserve                                                                            |
| `app/src/components/BugReportButton.tsx`                         | `bg-primary-500`                                                                                                                        | → `bg-primary`                                                                                                                       |
| `app/src/components/BugReportDialog.tsx`                         | `text-gray-500`, `bg-primary-500`                                                                                                       | → `text-muted-foreground`, → `bg-primary`                                                                                            |
| `app/src/components/StatusBadge.tsx`                             | `bg-primary-500 text-white hover:bg-primary-500`                                                                                        | → `bg-primary text-primary-foreground hover:bg-primary/90`                                                                           |
| `app/src/pages/Login.tsx`                                        | `bg-gray-50`                                                                                                                            | → `bg-background`                                                                                                                    |
| `app/src/pages/Welcome.tsx`                                      | `bg-gray-50`, `text-gray-900`, `text-gray-600`, `bg-blue-100`, `bg-gray-100`, `bg-gray-200`, `text-primary-500`, `primary-500` (9 hits) | Structural grays → semantic; `bg-blue-100` → `bg-primary/10`                                                                         |
| `app/src/pages/NotFound.tsx`                                     | `text-gray-500`, `text-gray-600` (2 hits)                                                                                               | → `text-muted-foreground`                                                                                                            |
| `app/src/pages/Dashboard.tsx`                                    | `text-primary-500`, `bg-primary-500` (4 hits)                                                                                           | → `text-primary`, `bg-primary`                                                                                                       |
| `app/src/pages/admin/AssessmentList.tsx`                         | `bg-primary-500` (2 hits)                                                                                                               | → `bg-primary`                                                                                                                       |
| `app/src/pages/admin/AssessmentDetail.tsx`                       | `bg-primary-500` (2 hits)                                                                                                               | → `bg-primary`                                                                                                                       |
| `app/src/pages/admin/AssessmentCreate.tsx`                       | `bg-primary-500` (4 hits)                                                                                                               | → `bg-primary`                                                                                                                       |
| `app/src/pages/admin/BugReports.tsx`                             | `bg-gray-400`, `bg-gray-50`                                                                                                             | `bg-gray-400` on low-severity badge → `bg-muted-foreground`; `bg-gray-50` page bg → `bg-background`                                  |
| `app/src/pages/admin/SessionList.tsx`                            | `bg-primary-500`, `bg-gray-100 text-gray-600` (3 hits)                                                                                  | primary → `bg-primary`; state badge → `bg-muted text-muted-foreground`                                                               |
| `app/src/pages/admin/SessionDetail.tsx`                          | `bg-primary-500`, `bg-gray-100 text-gray-600` (3 hits)                                                                                  | primary → `bg-primary`; state badge → `bg-muted text-muted-foreground`                                                               |
| `app/src/pages/admin/QuestionBankList.tsx`                       | `bg-primary-500` (2 hits)                                                                                                               | → `bg-primary`                                                                                                                       |
| `app/src/pages/admin/QuestionBankCreate.tsx`                     | `bg-primary-500`                                                                                                                        | → `bg-primary`                                                                                                                       |
| `app/src/pages/admin/QuestionBankDetail.tsx`                     | `bg-primary-500` (5 hits)                                                                                                               | → `bg-primary`                                                                                                                       |
| `app/src/pages/admin/InstructorList.tsx`                         | `bg-primary-500` (2 hits)                                                                                                               | → `bg-primary`                                                                                                                       |
| `app/src/pages/admin/QrPresenter.tsx`                            | Multiple slate/white (8 hits)                                                                                                           | INTENTIONAL — presenter mode; all preserved with comments, except `text-primary-500` → `text-primary`                                |
| `app/src/pages/admin/assessment-detail/EditAssessmentDialog.tsx` | `bg-primary-500`                                                                                                                        | → `bg-primary`                                                                                                                       |
| `app/src/pages/admin/assessment-detail/ItemAnalysisTab.tsx`      | `border-gray-200 bg-white`, `bg-gray-300`, Card `bg-white`                                                                              | choice container → `border-border bg-card`, bar → `bg-muted`, Card → remove `bg-white` (Card already has bg-card via semantic token) |
| `app/src/pages/admin/assessment-detail/ResponsesTab.tsx`         | `bg-gray-200` (progress bar)                                                                                                            | → `bg-muted`                                                                                                                         |
| `app/src/pages/admin/assessment-detail/QrCodeTab.tsx`            | `bg-white p-2` (QR img), `bg-primary-500`                                                                                               | QR → intentional preserve; button → `bg-primary`                                                                                     |
| `app/src/pages/public/TakeAssessment.tsx`                        | `text-slate-900`, `text-slate-600`, `text-gray-600` (3 hits)                                                                            | → `text-foreground`, `text-muted-foreground`                                                                                         |
| `app/src/pages/public/AttendSession.tsx`                         | `bg-gray-50`, `text-gray-500/600` (8 hits)                                                                                              | → `bg-background`, `text-muted-foreground`                                                                                           |
| `app/src/pages/public/CheckOutSession.tsx`                       | `bg-gray-50`, `text-gray-500/600` (7 hits)                                                                                              | → `bg-background`, `text-muted-foreground`                                                                                           |
| `app/src/pages/public/CreateAccount.tsx`                         | `text-gray-600`                                                                                                                         | → `text-muted-foreground`                                                                                                            |
| `app/src/pages/public/take-assessment/StudentInfoStep.tsx`       | `bg-white` (2 stat boxes), `bg-primary-500`                                                                                             | stat boxes → `bg-card`; button → `bg-primary`                                                                                        |
| `app/src/pages/public/take-assessment/AssessmentResults.tsx`     | `bg-white` (score circle — INTENTIONAL), `text-slate-700`, `text-gray-600` (4 hits)                                                     | score circle → preserve; text → semantic                                                                                             |
| `app/src/pages/student/StudentLogin.tsx`                         | `text-gray-600` (3 hits)                                                                                                                | → `text-muted-foreground`                                                                                                            |
| `app/src/pages/student/ForgotPassword.tsx`                       | `text-gray-600`                                                                                                                         | → `text-muted-foreground`                                                                                                            |
| `app/src/pages/student/ResetPassword.tsx`                        | `text-gray-600` (2 hits)                                                                                                                | → `text-muted-foreground`                                                                                                            |
| `app/src/pages/student/StudentDashboard.tsx`                     | `text-gray-600`                                                                                                                         | → `text-muted-foreground`                                                                                                            |
| `app/src/pages/student/AssessmentReview.tsx`                     | `text-gray-600`, `border-slate-200 bg-white text-slate-700`, `bg-slate-100`, `bg-slate-400` (3 hits)                                    | option button → `border-border bg-card text-foreground`; progress bars → `bg-muted`; text → semantic                                 |

---

## Open Questions

1. **AdminLayout.tsx fate after Phase 3**
   - What we know: AdminLayout.tsx has 9 hardcoded color hits (bg-gray-50, bg-white, multiple primary-500 nav links)
   - What's unclear: Phase 3 replaces AdminLayout with AppShell entirely. If Phase 3 is complete when Phase 5 runs, AdminLayout.tsx may no longer be rendered. However, the file still exists in the repo and will still fail the grep check.
   - Recommendation: Sweep AdminLayout.tsx as well, even if it's been superseded. It takes minimal effort and ensures the grep check passes cleanly.

2. **Glass Purple primary color value for SurveyJS**
   - What we know: The Glass Purple CSS variables are defined in Phase 1/2 under `[data-theme="glass"]`. The exact purple hex used for `--primary` in Glass Purple is defined there.
   - What's unclear: The exact hex value won't be confirmed until Phase 1/2 are complete. The research uses `#7c3aed` (violet-700) as an example.
   - Recommendation: When implementing SJS-02/03, read the `--primary` CSS variable value from the active Glass Purple theme and use that same hex for `--sjs-primary-backcolor`. Alternatively, use `getComputedStyle(document.documentElement).getPropertyValue('--primary')` to read the current value at runtime.

3. **BugReports color-coded badge context**
   - What we know: BugReports uses `bg-gray-400 text-white` for "low" severity badges and `bg-red-100/blue-100/purple-100` for category badges.
   - What's unclear: The grep pattern targets `bg-gray-` which would catch `bg-gray-400`. But `bg-red-100`, `bg-blue-100`, `bg-purple-100` are NOT in the grep pattern — they are intentional semantic status colors.
   - Recommendation: Replace `bg-gray-400` with `bg-secondary text-secondary-foreground` or `bg-muted text-muted-foreground` for "low" severity. Leave all colored badge variants (red, blue, purple, orange, yellow) untouched — they are not in the forbidden pattern list.

---

## Validation Architecture

_Nyquist validation is not enabled for this project (workflow.nyquist_validation not set in .planning/config.json). Skipping this section._

---

## Sources

### Primary (HIGH confidence)

- `/app/node_modules/survey-core/typings/src/themes.d.ts` — ITheme interface: `colorPalette`, `cssVariables`, `isPanelless` properties confirmed
- `/app/node_modules/survey-core/survey-core.css` (lines 339–1227) — `--sjs-general-backcolor`, `--sjs-general-forecolor`, `--sjs-primary-backcolor` variable cascade confirmed
- `/app/node_modules/survey-core/typings/src/survey.d.ts` (line 3277) — `applyTheme(theme: ITheme): void` signature confirmed
- `/app/package.json` — survey-core@2.5.10, survey-react-ui@2.5.10, React 19.1.0 versions confirmed
- All source files read directly — 109 hardcoded color references across 36 files, inventoried per-file

### Secondary (MEDIUM confidence)

- [SurveyJS Themes and Styles](https://surveyjs.io/form-library/documentation/manage-default-themes-and-styles) — Official docs, fetched 2026-02-24. Confirms `colorPalette: "dark"` usage, `cssVariables` object, and `ITheme` interface structure.
- WebSearch results confirming `applyTheme({ colorPalette: "dark", cssVariables: {...} })` pattern is current (2024-2025 sources)

### Tertiary (LOW confidence)

- Specific `--sjs-primary-backcolor` value for Glass Purple is estimated at `#7c3aed` (violet-700) based on the assumption that Phase 1/2 define `--primary` as a violet. Actual value must be read from the Phase 1 CSS definitions when implementing.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already installed, API confirmed via installed type definitions
- Architecture: HIGH — all source files read directly, exact grep counts verified
- SurveyJS dark theme: HIGH — ITheme interface confirmed from node_modules; CSS variable cascade confirmed from survey-core.css
- Glass Purple color values: MEDIUM — exact hex depends on Phase 1/2 output, estimated from violet palette

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (stable — no dependencies on fast-moving external APIs; all confirmed from local node_modules)
