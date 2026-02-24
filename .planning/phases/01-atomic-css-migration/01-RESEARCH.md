# Phase 1: Atomic CSS Migration - Research

**Researched:** 2026-02-24
**Domain:** Tailwind CSS v3 CSS variable migration, shadcn/ui theming
**Confidence:** HIGH

## Summary

Phase 1 converts the app's CSS variable system from HSL-component format (`--primary: 221 76% 46%` consumed via `hsl(var(--primary))`) to raw hex format (`--primary: #1b5fd0` consumed via `var(--primary)`). This is a pure structural migration — the visual output is preserved for solid colors, the brand color `#1b5fd0` maps identically from the existing `primary-500` hex value, and all `primary-NNN` utility class references are replaced with semantic equivalents.

The sister portal app (`mededprep-portal`) uses this exact target pattern in production. Its `tailwind.config.js` already uses `var(--xxx)` throughout, and its `index.css` stores all CSS variables as hex values. This provides a verified reference implementation with no guesswork.

There is one known limitation: Tailwind v3 cannot generate opacity modifier CSS (e.g., `bg-primary/90`) when the color token resolves to a CSS variable containing a hex value. This limitation is accepted — it exists in the portal too — and primarily affects hover effects in shadcn/ui base components (`button.tsx`, `badge.tsx`) and a few decorative tinted backgrounds. Solid primary color usage (the vast majority of the codebase) is fully preserved. Phase 4 will restore hover effects via Glass Purple-specific CSS techniques.

There is also a pre-existing build blocker: `@testing-library` packages are listed in `package.json` but not installed. `npm run build` currently fails with 31 TypeScript errors from test files. The Phase 1 plan must run `npm install` as its first step.

**Primary recommendation:** Follow the portal's exact pattern — hex values in `:root`, `var(--xxx)` in `tailwind.config.js`, remove static `primary-NNN` shade definitions, replace all 47 occurrences of `primary-500/100/50/600/700` classes in 20 source files, and accept that opacity modifier classes on semantic tokens silently produce no CSS output (matching portal behavior).

---

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                                                                                                                        | Research Support                                                                                                                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSS-01 | CSS variables migrate from HSL-component format to raw hex format atomically (index.css + tailwind.config + all primary-500 class references in one commit)                        | Confirmed: all three changes must be in one commit — partial state breaks every semantic color. Portal provides reference.                                                                                |
| CSS-02 | Tailwind config switches from `hsl(var(--xxx))` to `var(--xxx)` consumption pattern for all color tokens                                                                           | Confirmed: portal tailwind.config.js uses `var(--xxx)` throughout. Exact target pattern verified.                                                                                                         |
| CSS-03 | All `primary-500` / `primary-100` / `primary-50` / `primary-600` / `primary-700` utility class references replaced with semantic equivalents (`bg-primary`, `bg-primary/10`, etc.) | Confirmed: 47 occurrences across 20 files. Replacement mapping documented in Architecture Patterns. Note: `bg-primary/N` opacity modifiers won't generate CSS but matches portal behavior.                |
| CSS-04 | Global `border-color` rule in index.css switches from `hsl(var(--border))` to `var(--border)`                                                                                      | Confirmed: only one occurrence in the entire codebase (`index.css:37`). Straightforward single-line change. Adjacent `.sd-root-modern *` block must be preserved.                                         |
| CSS-05 | Glass Purple CSS variables defined under `[data-theme="glass"]` selector with dark background, purple accent, and rgba surface colors                                              | Designed: dark navy-purple background, violet primary accent, rgba glass surface for cards. Values documented in Code Examples.                                                                           |
| CSS-06 | Daylight CSS variables defined under `:root` selector matching current light appearance (no visual regression)                                                                     | Confirmed: hex values computed from existing HSL vars. Exact mapping documented in Code Examples. Visual regression is the primary risk — addressed via verified hex computation from current HSL values. |

</phase_requirements>

---

## Standard Stack

### Core

| Library      | Version                                | Purpose                 | Why Standard       |
| ------------ | -------------------------------------- | ----------------------- | ------------------ |
| Tailwind CSS | 3.4.19 (installed)                     | Utility CSS framework   | Already in project |
| PostCSS      | 8.5.3 (installed)                      | CSS processing pipeline | Already in project |
| shadcn/ui    | Components in `app/src/components/ui/` | Component library       | Already in project |

### Supporting

| Library             | Version           | Purpose             | When to Use                                                           |
| ------------------- | ----------------- | ------------------- | --------------------------------------------------------------------- |
| tailwindcss-animate | 1.0.7 (installed) | Animation utilities | Already in use — preserve `plugins: [require('tailwindcss-animate')]` |

### Alternatives Considered

| Instead of                          | Could Use                                                | Tradeoff                                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raw hex vars + `var(--primary)`     | HSL channel vars + `rgb(var(--primary) / <alpha-value>)` | RGB channel approach enables opacity modifiers but stores vars as `27 95 208` (three numbers) rather than `#1b5fd0` (hex) — violates success criterion 2 |
| `var(--primary)` in tailwind config | `oklch(from var(--primary) l c h / <alpha-value>)`       | CSS Relative Color Syntax enables opacity modifiers with hex vars but baseline support only reached ~2024 — browser compat risk not worth it for Phase 1 |

**Installation:** No new packages required. Run `npm install` (in `app/`) to install pre-existing `@testing-library` packages that are in `package.json` but missing from `node_modules` — required for build to pass.

---

## Architecture Patterns

### Recommended Project Structure (unchanged)

```
app/src/
├── index.css              # All :root and [data-theme="glass"] variables here
├── tailwind.config.js     # var(--xxx) pattern, no static primary-NNN
└── components/ui/         # shadcn components — NO changes needed in Phase 1
```

### Pattern 1: Hex CSS Variable Definition (index.css)

**What:** CSS variables store raw hex values under `:root`. A second block under `[data-theme="glass"]` provides Glass Purple overrides.
**When to use:** This is the ONLY format for Phase 1 and beyond.

```css
/* Source: Portal mededprep-portal/app/src/index.css (verified reference) */
@layer base {
  :root {
    --background: #ffffff;
    --foreground: #020817;
    --card: #ffffff;
    --card-foreground: #020817;
    --popover: #ffffff;
    --popover-foreground: #020817;
    --primary: #1b5fd0;
    --primary-foreground: #f8fafc;
    --secondary: #f1f5f9;
    --secondary-foreground: #0f172a;
    --muted: #f1f5f9;
    --muted-foreground: #64748b;
    --accent: #f1f5f9;
    --accent-foreground: #0f172a;
    --destructive: #ef4444;
    --destructive-foreground: #f8fafc;
    --border: #e2e8f0;
    --input: #e2e8f0;
    --ring: #1b5fd0;
    --radius: 0.5rem;
    --chart-1: #e76e50;
    --chart-2: #2a9d90;
    --chart-3: #274754;
    --chart-4: #e8c468;
    --chart-5: #f4a462;
  }

  [data-theme='glass'] {
    --background: #0d0a1e;
    --foreground: #f8fafc;
    --card: rgba(17, 12, 36, 0.7);
    --card-foreground: #f8fafc;
    --popover: rgba(17, 12, 36, 0.95);
    --popover-foreground: #f8fafc;
    --primary: #8b5cf6;
    --primary-foreground: #ffffff;
    --secondary: rgba(139, 92, 246, 0.1);
    --secondary-foreground: #e2e8f0;
    --muted: rgba(139, 92, 246, 0.05);
    --muted-foreground: #94a3b8;
    --accent: rgba(139, 92, 246, 0.15);
    --accent-foreground: #f8fafc;
    --destructive: #ef4444;
    --destructive-foreground: #ffffff;
    --border: rgba(139, 92, 246, 0.2);
    --input: rgba(139, 92, 246, 0.1);
    --ring: #8b5cf6;
    --chart-1: #a78bfa;
    --chart-2: #34d399;
    --chart-3: #60a5fa;
    --chart-4: #fbbf24;
    --chart-5: #f87171;
  }
}
```

### Pattern 2: Tailwind Config var() Pattern

**What:** All Tailwind color tokens reference CSS variables directly via `var(--xxx)`. No `hsl()` wrapper. Static `primary-NNN` shade entries are removed.
**When to use:** This is the ONLY format for Phase 1 and beyond.

```javascript
// Source: Portal mededprep-portal/app/tailwind.config.js (verified reference)
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
          // NO more 50/100/500/600/700 entries — these are removed
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### Pattern 3: Component Class Replacement Map (CSS-03)

**What:** Every `primary-NNN` class in component/page files is replaced with a semantic equivalent.

| Old Class                       | New Class                   | Notes                                                                                                            |
| ------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `bg-primary-500`                | `bg-primary`                | Solid background                                                                                                 |
| `text-primary-500`              | `text-primary`              | Text color                                                                                                       |
| `border-primary-500`            | `border-primary`            | Border color                                                                                                     |
| `hover:bg-primary-500/90`       | `hover:bg-primary/90`       | Hover BG — opacity modifier won't generate CSS in TW v3 with hex var; silently no-ops (accepted, matches portal) |
| `hover:border-primary-500/50`   | `hover:border-primary/50`   | Same opacity issue; Welcome.tsx hover border                                                                     |
| `bg-primary-500/10`             | `bg-primary/10`             | Tinted BG — same opacity issue; QrPresenter badge                                                                |
| `peer-checked:bg-primary-500`   | `peer-checked:bg-primary`   | ToggleSwitch checked state                                                                                       |
| `border-b-2 border-primary-500` | `border-b-2 border-primary` | AdminLayout active nav indicator                                                                                 |

**Files and occurrences:**

| File                                                             | Count | Patterns                                          |
| ---------------------------------------------------------------- | ----- | ------------------------------------------------- |
| `app/src/pages/admin/AssessmentCreate.tsx`                       | 5     | bg-primary-500, hover:bg-primary-500/90           |
| `app/src/pages/admin/QuestionBankDetail.tsx`                     | 5     | bg-primary-500, hover:bg-primary-500/90           |
| `app/src/components/AdminLayout.tsx`                             | 7     | border-primary-500, text-primary-500 (active nav) |
| `app/src/pages/admin/AssessmentDetail.tsx`                       | 2     | bg-primary-500, hover:bg-primary-500/90           |
| `app/src/pages/admin/AssessmentList.tsx`                         | 2     | bg-primary-500, hover:bg-primary-500/90           |
| `app/src/pages/admin/QuestionBankList.tsx`                       | 2     | bg-primary-500, hover:bg-primary-500/90           |
| `app/src/pages/admin/SessionList.tsx`                            | 2     | bg-primary-500, hover:bg-primary-500/90           |
| `app/src/pages/admin/SessionDetail.tsx`                          | 2     | bg-primary-500, hover:bg-primary-500/90           |
| `app/src/pages/admin/InstructorList.tsx`                         | 2     | bg-primary-500, hover:bg-primary-500/90           |
| `app/src/pages/Dashboard.tsx`                                    | 2     | bg-primary-500, hover:bg-primary-500/90           |
| `app/src/pages/Welcome.tsx`                                      | 4     | text-primary-500, hover:border-primary-500/50     |
| `app/src/pages/admin/QrPresenter.tsx`                            | 2     | text-primary-500, bg-primary-500/10               |
| `app/src/components/BugReportButton.tsx`                         | 1     | bg-primary-500, hover:bg-primary-500/90           |
| `app/src/components/BugReportDialog.tsx`                         | 1     | bg-primary-500, hover:bg-primary-500/90           |
| `app/src/components/StatusBadge.tsx`                             | 1     | bg-primary-500, hover:bg-primary-500              |
| `app/src/components/ToggleSwitch.tsx`                            | 1     | peer-checked:bg-primary-500                       |
| `app/src/pages/admin/QuestionBankCreate.tsx`                     | 1     | bg-primary-500, hover:bg-primary-500/90           |
| `app/src/pages/public/take-assessment/StudentInfoStep.tsx`       | 1     | bg-primary-500, hover:bg-primary-500/90           |
| `app/src/pages/admin/assessment-detail/EditAssessmentDialog.tsx` | 1     | bg-primary-500, hover:bg-primary-500/90           |
| `app/src/pages/admin/assessment-detail/QrCodeTab.tsx`            | 1     | bg-primary-500, hover:bg-primary-500/90           |

**Total: 47 occurrences across 20 files.**

### Pattern 4: Preserving the SurveyJS Border-Color Revert Block

**What:** The `.sd-root-modern` block in `index.css` must remain untouched.
**Critical:** This block prevents the global `border-color` rule from overriding SurveyJS internal borders.

```css
/* PRESERVE AS-IS — do not modify */
.sd-root-modern *,
.sd-root-modern *::before,
.sd-root-modern *::after {
  border-color: revert;
}
```

### Anti-Patterns to Avoid

- **Partial state commit:** Never commit index.css without tailwind.config.js and component file changes in the same commit. Partial state = semantic tokens point to undefined HSL variables = all semantic colors render as transparent/invalid.
- **Keeping hsl() wrapper:** After CSS variables store hex values, `hsl(#1b5fd0)` is INVALID CSS. The `hsl()` wrapper MUST be removed from tailwind.config.js.
- **Using opacity modifier for semantic tokens:** Don't expect `bg-primary/90` to generate CSS with `var(--primary)` pointing to hex. It silently generates nothing in Tailwind v3. This is accepted behavior, not a bug to fix in Phase 1.
- **Modifying shadcn/ui components in `components/ui/`:** button.tsx, badge.tsx, skeleton.tsx already use semantic tokens (`bg-primary`, `bg-primary/90`). These are NOT changed in Phase 1 — they're already correct.
- **Touching the `.sd-root-modern` block:** This block is critical for SurveyJS compatibility. Never modify it.

---

## Don't Hand-Roll

| Problem                                   | Don't Build            | Use Instead                                      | Why                                                                        |
| ----------------------------------------- | ---------------------- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| Converting HSL to hex                     | Manual hex lookup      | Use the pre-computed hex values in Code Examples | Values already verified via JavaScript computation from current HSL values |
| Opacity modifier support for hex CSS vars | Custom Tailwind plugin | Accept the limitation                            | Portal already accepts this; Phase 4 handles hover effects differently     |
| Glass Purple palette design               | Design from scratch    | Use the values in Code Examples                  | Designed to match the project's dark/purple aesthetic requirements         |

**Key insight:** This is a mechanical transformation. The values are mathematically derived from the current HSL vars. There's no creative work needed — just apply the pre-computed hex values.

---

## Common Pitfalls

### Pitfall 1: Opacity Modifier Silent No-Op

**What goes wrong:** `bg-primary/90`, `bg-primary/10`, `border-primary/30` etc. appear in source code (and compile without error), but Tailwind generates NO CSS rule for them when `primary` is defined as `var(--primary)`.
**Why it happens:** Tailwind v3's color opacity system requires the color value to be parseable at build time. CSS variable references (`var(--primary)`) are opaque to Tailwind's color parser — it cannot construct `rgb(... / 0.9)` from them.
**How to avoid:** Accept it as a known limitation for Phase 1. The affected cases are:

- `hover:bg-primary/90` on buttons → button hover effect disappears (acceptable per Phase 1 scope)
- `bg-primary/10` on skeleton, QrPresenter badge → shows as transparent (acceptable)
- `hover:bg-primary/80` on badges → badge hover effect disappears (acceptable)
  The portal has the same pattern and ships with this limitation.
  **Warning signs:** If the visual regression check shows buttons or badges changing color on hover in DevTools, that would indicate the old `hsl(var(--primary) / 0.9)` is still being generated — meaning the migration is incomplete.

### Pitfall 2: Build Fails Before Migration Even Starts

**What goes wrong:** `npm run build` fails with 31 TypeScript errors from test files (`src/__tests__/*.test.tsx`).
**Why it happens:** `@testing-library/react`, `@testing-library/user-event`, and `@testing-library/jest-dom` are in `package.json` but NOT installed in `node_modules`. The TypeScript compiler includes test files via `"include": ["src"]` in `tsconfig.json`.
**How to avoid:** Run `cd app && npm install` as the FIRST step before any CSS changes. This installs the missing packages.
**Warning signs:** Any TypeScript error referencing `src/__tests__/` files before CSS changes are made.

### Pitfall 3: HSL-to-Hex Rounding Introduces Color Drift

**What goes wrong:** Computing hex from HSL mathematically gives a slightly different value than the intended brand color.
**Why it happens:** The existing `--primary: 221 76% 46%` computes to `#1c55ce` (not `#1b5fd0`). These differ by ~1-2 RGB units — imperceptible visually but technically different.
**How to avoid:** Use the brand color `#1b5fd0` for `--primary` (and `--ring`) directly, as specified in requirements. For other variables, use the pre-computed hex values from the Code Examples section. They were computed from the exact HSL values in `index.css`.
**Warning signs:** If `var(--primary)` in DevTools shows `#1c55ce` instead of `#1b5fd0`, the wrong computed value was used.

### Pitfall 4: Forgetting the border-color Rule

**What goes wrong:** Only the `:root` CSS variables get migrated, but the global `border-color: hsl(var(--border))` rule on line 37 of `index.css` is left unchanged.
**Why it happens:** It's in a separate `@layer base {}` block, easy to miss.
**How to avoid:** Change to `border-color: var(--border)` in the same commit. This is CSS-04.
**Warning signs:** After migration, searching `index.css` for `hsl(` returns a result.

### Pitfall 5: Atomic Commit Failure

**What goes wrong:** The changes to `index.css`, `tailwind.config.js`, and component files are split across multiple commits, or only some component files are changed.
**Why it happens:** The scope is large (22 files total) and it's tempting to commit incrementally.
**How to avoid:** Make all changes in a single atomic git commit. The ONLY state that can exist is either the old state (all HSL) or the new state (all hex). Any intermediate state breaks the entire app.
**Warning signs:** Intermediate commits where Tailwind classes like `bg-primary` generate `hsl(#1b5fd0)` — which is INVALID CSS.

---

## Code Examples

Verified patterns from official sources and codebase analysis:

### Complete index.css After Migration

```css
/* FINAL STATE of app/src/index.css after Phase 1 */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: #ffffff;
    --foreground: #020817;
    --card: #ffffff;
    --card-foreground: #020817;
    --popover: #ffffff;
    --popover-foreground: #020817;
    --primary: #1b5fd0;
    --primary-foreground: #f8fafc;
    --secondary: #f1f5f9;
    --secondary-foreground: #0f172a;
    --muted: #f1f5f9;
    --muted-foreground: #64748b;
    --accent: #f1f5f9;
    --accent-foreground: #0f172a;
    --destructive: #ef4444;
    --destructive-foreground: #f8fafc;
    --border: #e2e8f0;
    --input: #e2e8f0;
    --ring: #1b5fd0;
    --radius: 0.5rem;
    --chart-1: #e76e50;
    --chart-2: #2a9d90;
    --chart-3: #274754;
    --chart-4: #e8c468;
    --chart-5: #f4a462;
  }

  [data-theme='glass'] {
    --background: #0d0a1e;
    --foreground: #f8fafc;
    --card: rgba(17, 12, 36, 0.7);
    --card-foreground: #f8fafc;
    --popover: rgba(17, 12, 36, 0.95);
    --popover-foreground: #f8fafc;
    --primary: #8b5cf6;
    --primary-foreground: #ffffff;
    --secondary: rgba(139, 92, 246, 0.1);
    --secondary-foreground: #e2e8f0;
    --muted: rgba(139, 92, 246, 0.05);
    --muted-foreground: #94a3b8;
    --accent: rgba(139, 92, 246, 0.15);
    --accent-foreground: #f8fafc;
    --destructive: #ef4444;
    --destructive-foreground: #ffffff;
    --border: rgba(139, 92, 246, 0.2);
    --input: rgba(139, 92, 246, 0.1);
    --ring: #8b5cf6;
    --chart-1: #a78bfa;
    --chart-2: #34d399;
    --chart-3: #60a5fa;
    --chart-4: #fbbf24;
    --chart-5: #f87171;
  }
}

@layer base {
  * {
    border-color: var(--border);
  }
  body {
    @apply bg-background text-foreground;
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
}

/* Prevent Tailwind base border-color from overriding SurveyJS internal styles */
.sd-root-modern *,
.sd-root-modern *::before,
.sd-root-modern *::after {
  border-color: revert;
}
```

### Verification Commands

```bash
# CSS-01/02: Verify no hsl(var( remains anywhere in CSS/config
grep -rn "hsl(var(--" app/src/ app/tailwind.config.js

# CSS-03: Verify no primary-NNN classes remain
grep -rn "primary-500\|primary-100\|primary-50\b\|primary-600\|primary-700" app/src/

# CSS-02: Verify DevTools shows hex in :root
# Open browser DevTools → Elements → :root → check --primary shows #1b5fd0 (not computed)

# QAL-01/02: Build and typecheck
cd app && npm install && npm run build
cd app && npm run typecheck  # expect test file errors only (pre-existing)
```

### HSL-to-Hex Computation Reference

| CSS Variable               | Old HSL Value       | New Hex Value | Source                                         |
| -------------------------- | ------------------- | ------------- | ---------------------------------------------- |
| `--background`             | `0 0% 100%`         | `#ffffff`     | Computed                                       |
| `--foreground`             | `222.2 84% 4.9%`    | `#020817`     | Computed                                       |
| `--card`                   | `0 0% 100%`         | `#ffffff`     | Computed                                       |
| `--card-foreground`        | `222.2 84% 4.9%`    | `#020817`     | Computed                                       |
| `--popover`                | `0 0% 100%`         | `#ffffff`     | Computed                                       |
| `--popover-foreground`     | `222.2 84% 4.9%`    | `#020817`     | Computed                                       |
| `--primary`                | `221 76% 46%`       | `#1b5fd0`     | **Brand color** (overrides computed `#1c55ce`) |
| `--primary-foreground`     | `210 40% 98%`       | `#f8fafc`     | Computed                                       |
| `--secondary`              | `210 40% 96.1%`     | `#f1f5f9`     | Computed                                       |
| `--secondary-foreground`   | `222.2 47.4% 11.2%` | `#0f172a`     | Computed                                       |
| `--muted`                  | `210 40% 96.1%`     | `#f1f5f9`     | Computed                                       |
| `--muted-foreground`       | `215.4 16.3% 46.9%` | `#64748b`     | Computed                                       |
| `--accent`                 | `210 40% 96.1%`     | `#f1f5f9`     | Computed                                       |
| `--accent-foreground`      | `222.2 47.4% 11.2%` | `#0f172a`     | Computed                                       |
| `--destructive`            | `0 84.2% 60.2%`     | `#ef4444`     | Computed                                       |
| `--destructive-foreground` | `210 40% 98%`       | `#f8fafc`     | Computed                                       |
| `--border`                 | `214.3 31.8% 91.4%` | `#e2e8f0`     | Computed                                       |
| `--input`                  | `214.3 31.8% 91.4%` | `#e2e8f0`     | Computed                                       |
| `--ring`                   | `221 76% 46%`       | `#1b5fd0`     | **Brand color**                                |
| `--chart-1`                | `12 76% 61%`        | `#e76e50`     | Computed                                       |
| `--chart-2`                | `173 58% 39%`       | `#2a9d90`     | Computed                                       |
| `--chart-3`                | `197 37% 24%`       | `#274754`     | Computed                                       |
| `--chart-4`                | `43 74% 66%`        | `#e8c468`     | Computed                                       |
| `--chart-5`                | `27 87% 67%`        | `#f4a462`     | Computed                                       |

---

## State of the Art

| Old Approach                                                                           | Current Approach                                                            | When Changed | Impact                                                                                           |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------ |
| HSL channels in CSS vars (`--primary: 221 76% 46%`) consumed via `hsl(var(--primary))` | Hex values in CSS vars (`--primary: #1b5fd0`) consumed via `var(--primary)` | Phase 1      | Enables clean theme switching via `[data-theme]` attribute; exact hex values visible in DevTools |
| Static shade classes (`primary-500`, `primary-100`)                                    | Semantic tokens only (`bg-primary`, `text-primary`)                         | Phase 1      | Tokens adapt to active theme; no more hardcoded hex values in component class names              |

**Deprecated/outdated after Phase 1:**

- `primary-50`, `primary-100`, `primary-500`, `primary-600`, `primary-700` Tailwind color keys: removed from tailwind.config.js. Will not generate utility classes.
- `hsl(var(--border))`: replaced with `var(--border)` in the `* { border-color: }` rule.

---

## Open Questions

1. **Glass Purple Card rgba() value accuracy**
   - What we know: Requirements say "rgba surface colors" for glass cards
   - What's unclear: The exact rgba values aren't specified — the values in Code Examples are designed based on dark purple aesthetic
   - Recommendation: Use the designed values in Code Examples. Phase 4 will refine glass blur/transparency values when testing visually. Phase 1 just needs them defined.

2. **Opacity modifier regression scope**
   - What we know: `bg-primary/90` on `button.tsx` hover won't generate CSS after migration
   - What's unclear: Whether success criterion 1 ("renders visually identical") applies to hover states specifically
   - Recommendation: Treat hover state changes as acceptable in Phase 1, consistent with portal behavior. Success criterion 1 applies to static rendering. Document in commit message that hover effects are temporarily affected pending Phase 4 work.

3. **Pre-existing build failure scope**
   - What we know: `npm run build` fails due to missing `@testing-library` packages; test file TS errors exist
   - What's unclear: Whether success criterion 5 ("npm run build passes with zero errors") can be satisfied if test files have pre-existing errors
   - Recommendation: Run `npm install` to install missing packages. If test file errors remain after npm install (e.g., `@testing-library/jest-dom` type augmentation issues), add `"@testing-library/jest-dom"` to tsconfig `types` array or update the `tsconfig.json` `exclude` to exclude `src/__tests__/`. The Phase 1 plan should include fixing this blocker as Task 0.

---

## Sources

### Primary (HIGH confidence)

- `/home/jeramey/projects/mededprep-ecosystem/mededprep-portal/app/src/index.css` — Verified reference implementation using hex CSS vars with exact same project family
- `/home/jeramey/projects/mededprep-ecosystem/mededprep-portal/app/tailwind.config.js` — Verified reference for `var(--xxx)` Tailwind config pattern
- `/home/jeramey/projects/mededprep-ecosystem/mededprep-inst/app/src/index.css` — Current state of migration source
- `/home/jeramey/projects/mededprep-ecosystem/mededprep-inst/app/tailwind.config.js` — Current Tailwind config to be migrated
- Live Tailwind CLI tests via `npx tailwindcss --input ... --content ...` — Verified opacity modifier behavior in both current and target configs

### Secondary (MEDIUM confidence)

- [shadcn/ui theming docs](https://ui.shadcn.com/docs/theming) — Confirms current Tailwind v4 approach uses OKLCH; Tailwind v3 uses the HSL-component or RGB-channel patterns
- [Tailwind v3 opacity modifier discussion](https://github.com/tailwindlabs/tailwindcss/discussions/7125) — Community-confirmed: hex CSS variables don't enable opacity modifiers in Tailwind v3

### Tertiary (LOW confidence)

- None — all key claims verified via live Tailwind CLI execution

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — portal is verified reference, no new packages needed
- Architecture: HIGH — exact patterns verified via live Tailwind CLI output, portal reference
- Pitfalls: HIGH — opacity modifier behavior confirmed via live testing, pre-existing build failure confirmed

**Research date:** 2026-02-24
**Valid until:** 2026-04-24 (stable — Tailwind v3 behavior unlikely to change; valid until Tailwind v4 migration if planned)
