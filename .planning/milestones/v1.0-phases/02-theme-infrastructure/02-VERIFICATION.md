---
phase: 02-theme-infrastructure
verified: 2026-02-24T18:10:00Z
status: gaps_found
score: 4/5 success criteria verified
gaps:
  - truth: 'Clicking the sun/moon toggle button switches the entire UI between Daylight and Glass Purple immediately'
    status: failed
    reason: "CSS selector mismatch — index.css defines Glass Purple variables under [data-theme='glass'] but all JS code (ThemeContext, FOUC script, theme.ts) writes data-theme='glass-purple'. The CSS never activates."
    artifacts:
      - path: 'app/src/index.css'
        issue: "Glass Purple variables defined under [data-theme='glass'] selector (line 34), not [data-theme='glass-purple']"
    missing:
      - "Change [data-theme='glass'] to [data-theme='glass-purple'] in app/src/index.css line 34"
  - truth: 'Refreshing the page after selecting Glass Purple restores Glass Purple without any white flash'
    status: failed
    reason: "Same CSS selector mismatch. The FOUC script correctly sets data-theme='glass-purple' on <html> before React mounts, but the CSS never responds to that attribute value. Page will always render with :root (Daylight) variables regardless of what the FOUC script sets."
    artifacts:
      - path: 'app/src/index.css'
        issue: 'Glass Purple CSS variables are unreachable via any data-theme attribute the app will ever write'
    missing:
      - "Same fix: rename [data-theme='glass'] to [data-theme='glass-purple'] in app/src/index.css"
human_verification:
  - test: 'Click the toggle button in admin header and observe visual change'
    expected: 'The entire UI background, text colors, primary colors, and card colors shift from light to dark purple scheme immediately'
    why_human: 'Cannot verify CSS variable activation programmatically — requires browser render to confirm data-theme attribute triggers the correct @layer rule'
  - test: 'Set Glass Purple, reload the page, observe the initial paint'
    expected: 'No white flash — page loads directly into the dark purple scheme without momentarily showing the white daylight theme'
    why_human: 'FOUC detection requires visual observation of the paint sequence in a real browser'
  - test: 'Visit the app for the first time with OS dark mode enabled'
    expected: 'App loads in Glass Purple automatically (no toggle interaction required)'
    why_human: 'System preference detection requires a real browser with prefers-color-scheme media query support'
---

# Phase 2: Theme Infrastructure Verification Report

**Phase Goal:** Users can switch between Daylight and Glass Purple themes via a toggle button, the preference survives page reloads, and there is no white flash when loading Glass Purple
**Verified:** 2026-02-24T18:10:00Z
**Status:** GAPS FOUND
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Success Criteria)

| #   | Truth                                                                                                                | Status                 | Evidence                                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Clicking the sun/moon toggle button switches the entire UI between Daylight and Glass Purple immediately             | FAILED                 | Toggle calls `toggleTheme()` which sets `data-theme="glass-purple"` on `<html>`, but CSS only responds to `[data-theme='glass']` — attribute never matches selector |
| 2   | Refreshing the page after selecting Glass Purple restores Glass Purple without any white flash                       | FAILED                 | FOUC script wiring is correct but inert — sets `data-theme="glass-purple"` which CSS ignores                                                                        |
| 3   | A user visiting for the first time with prefers-color-scheme: dark system preference sees Glass Purple automatically | FAILED (blocked by #1) | Logic is correct but CSS mismatch means Glass Purple variables never load                                                                                           |
| 4   | The toggle button is present in both the admin area and the student area                                             | VERIFIED               | `ThemeToggle` imported and rendered in both `AdminLayout.tsx` (line 4, 17) and `StudentLayout.tsx` (line 7, 80)                                                     |
| 5   | npm run build and npm run typecheck pass with zero errors                                                            | VERIFIED               | `npx tsc --noEmit` exits 0; `npm run build` completes in 6.79s with zero errors                                                                                     |

**Score:** 2/5 success criteria fully verified (criteria 1-3 blocked by single CSS selector mismatch; criteria 4-5 verified)

Note: Criteria 1, 2, and 3 all fail from the same root cause — a single-character mismatch between the CSS selector and the attribute value written by JS. The infrastructure wiring (FOUC script, ThemeContext, lazy init, localStorage) is correctly implemented.

---

## Required Artifacts

### Plan 02-01 Artifacts

| Artifact                            | Expected                                       | Status   | Details                                                                                                                                                  |
| ----------------------------------- | ---------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/src/lib/theme.ts`              | Theme type, THEME_STORAGE_KEY, getInitialTheme | VERIFIED | Exports `Theme`, `THEME_STORAGE_KEY`, `THEMES`, `getInitialTheme`. Both localStorage and matchMedia wrapped in try/catch.                                |
| `app/src/contexts/ThemeContext.tsx` | ThemeProvider, useTheme hook                   | VERIFIED | Exports `ThemeProvider` and `useTheme`. Lazy `useState(getInitialTheme)` (function ref, not call). `useTheme` throws outside provider.                   |
| `app/index.html`                    | FOUC prevention inline script in head          | VERIFIED | Inline IIFE script at line 6 (before `<title>`, before module script at line 28). Sets `data-theme` with localStorage + matchMedia fallback + try/catch. |
| `app/src/main.tsx`                  | ThemeProvider wrapping React tree              | VERIFIED | `ThemeProvider` wraps `<App />` and `<Toaster />` inside `<BrowserRouter>`.                                                                              |

### Plan 02-02 Artifacts

| Artifact                               | Expected                                  | Status   | Details                                                                                                                                                           |
| -------------------------------------- | ----------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/src/components/ThemeToggle.tsx`   | Sun/Moon toggle button                    | VERIFIED | Default export. Uses `useTheme()`. Shows `Moon` in daylight, `Sun` in glass-purple. Accessible `aria-label` describes action. shadcn `Button` ghost/icon variant. |
| `app/src/components/AdminLayout.tsx`   | Admin layout with ThemeToggle in header   | VERIFIED | `import ThemeToggle` at line 4. `<ThemeToggle />` rendered at line 17 between email span and Sign Out button.                                                     |
| `app/src/components/StudentLayout.tsx` | Student layout with ThemeToggle in header | VERIFIED | `import ThemeToggle` at line 7. `<ThemeToggle />` rendered at line 80 between student name span and Logout button.                                                |

---

## Key Link Verification

### Plan 02-01 Key Links

| From                                | To                                  | Via                                                 | Status | Details                                                                                                |
| ----------------------------------- | ----------------------------------- | --------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| `app/index.html`                    | `document.documentElement`          | inline script sets data-theme attribute             | WIRED  | `document.documentElement.setAttribute('data-theme', theme)` at line 21 of index.html                  |
| `app/src/contexts/ThemeContext.tsx` | `app/src/lib/theme.ts`              | imports Theme type and getInitialTheme              | WIRED  | `import { type Theme, THEME_STORAGE_KEY, getInitialTheme } from '@/lib/theme'` at line 3               |
| `app/src/contexts/ThemeContext.tsx` | `document.documentElement`          | useEffect sets data-theme attribute on theme change | WIRED  | `document.documentElement.setAttribute('data-theme', theme)` inside useEffect at line 17               |
| `app/src/main.tsx`                  | `app/src/contexts/ThemeContext.tsx` | ThemeProvider wraps App component                   | WIRED  | `import { ThemeProvider } from './contexts/ThemeContext'` at line 7; `<ThemeProvider>` used at line 24 |

### Plan 02-02 Key Links

| From                                   | To                                   | Via                                                | Status | Details                                                                                                               |
| -------------------------------------- | ------------------------------------ | -------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| `app/src/components/ThemeToggle.tsx`   | `app/src/contexts/ThemeContext.tsx`  | useTheme hook for toggleTheme and theme state      | WIRED  | `import { useTheme } from '@/contexts/ThemeContext'` at line 3; `const { theme, toggleTheme } = useTheme()` at line 6 |
| `app/src/components/AdminLayout.tsx`   | `app/src/components/ThemeToggle.tsx` | imports and renders ThemeToggle in header flex row | WIRED  | `import ThemeToggle from '@/components/ThemeToggle'` at line 4; `<ThemeToggle />` rendered at line 17                 |
| `app/src/components/StudentLayout.tsx` | `app/src/components/ThemeToggle.tsx` | imports and renders ThemeToggle in header flex row | WIRED  | `import ThemeToggle from '@/components/ThemeToggle'` at line 7; `<ThemeToggle />` rendered at line 80                 |

### CRITICAL BROKEN LINK

| From                                     | To                                         | Via                          | Status | Details                                                                                                                     |
| ---------------------------------------- | ------------------------------------------ | ---------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| JS runtime (`data-theme="glass-purple"`) | `app/src/index.css` Glass Purple CSS block | CSS attribute selector match | BROKEN | JS writes `data-theme="glass-purple"` but CSS selector is `[data-theme='glass']` (line 34 of index.css). No match possible. |

---

## Requirements Coverage

| Requirement | Source Plan | Description                                                                                                         | Status                                   | Evidence                                                                                                                                                                           |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| THM-01      | 02-01       | ThemeContext provider exposes `theme` state and `setTheme` function via React context                               | SATISFIED                                | ThemeContext exports `theme`, `setTheme` (as `setThemeState`), and `toggleTheme` via context. All three are in the context interface.                                              |
| THM-02      | 02-01       | Theme persists to localStorage and loads on initialization without server round-trip                                | SATISFIED                                | localStorage write in `useEffect`. Lazy `useState(getInitialTheme)` reads localStorage synchronously before first render. No server round-trip.                                    |
| THM-03      | 02-01       | FOUC prevention inline script in index.html sets `data-theme` attribute on `<html>` before React mounts             | SATISFIED (mechanism) / BLOCKED (effect) | Script exists and fires before module script. Sets attribute correctly. But CSS never responds to the attribute value written.                                                     |
| THM-04      | 02-01       | System preference detection on first visit — users with `prefers-color-scheme: dark` get Glass Purple automatically | BLOCKED                                  | Logic implemented correctly in both FOUC script and `getInitialTheme`. Blocked by CSS selector mismatch — dark mode users get `data-theme="glass-purple"` but see daylight colors. |
| THM-05      | 02-02       | Sun/Moon toggle button switches between Daylight and Glass Purple themes                                            | BLOCKED                                  | Toggle mechanism fully wired. `onClick={toggleTheme}` calls context which updates state and writes attribute. Blocked by CSS mismatch — no visual change occurs.                   |
| THM-06      | 02-02       | Toggle placed in admin sidebar header and student page header                                                       | SATISFIED                                | ThemeToggle present and rendered in both AdminLayout and StudentLayout headers.                                                                                                    |

**Note on THM-01 wording:** REQUIREMENTS.md says "exposes `theme` state and `setTheme` function" but the plan spec also required `toggleTheme`. The implementation exposes all three (`theme`, `setTheme`, `toggleTheme`). THM-01 is satisfied and exceeded.

**Orphaned requirements:** None. All six THM requirements are claimed by Phase 2 plans. No Phase 2 requirements appear in REQUIREMENTS.md traceability table that are not in a plan's `requirements` field.

---

## Anti-Patterns Found

| File                | Line | Pattern                                                                                            | Severity | Impact                                                                                        |
| ------------------- | ---- | -------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `app/src/index.css` | 34   | `[data-theme='glass']` selector does not match `data-theme="glass-purple"` attribute written by JS | BLOCKER  | Glass Purple theme variables never activate — entire Glass Purple visual experience is broken |

No TODO/FIXME/placeholder comments found in any modified files.
No empty implementations (return null, return {}, etc.) found.
No console.log-only implementations found.

---

## Human Verification Required

### 1. Glass Purple Visual Switch

**Test:** Log in as admin, click the sun/moon toggle button in the header
**Expected:** Entire UI background shifts to dark purple (`#0d0a1e`), text becomes light, primary color changes from blue (`#1b5fd0`) to purple (`#8b5cf6`)
**Why human:** CSS activation requires browser rendering — cannot verify that `data-theme` attribute triggers the CSS block programmatically

### 2. FOUC Check on Reload

**Test:** While in Glass Purple theme, press F5 (hard refresh)
**Expected:** Page paints directly in dark purple — no white flash lasting more than one frame
**Why human:** Paint sequence requires visual observation in a real browser; no automated tool can observe the before-React-mount state

### 3. System Dark Mode First Visit

**Test:** Clear localStorage, enable OS dark mode (System Preferences / Display Settings), open app in fresh browser tab
**Expected:** App loads in Glass Purple automatically without any toggle interaction
**Why human:** prefers-color-scheme behavior requires OS-level configuration and browser rendering

---

## Root Cause Analysis

### The Single Blocking Issue

All three failed success criteria trace to one line in one file:

**`app/src/index.css`, line 34:**

```css
[data-theme='glass'] {    /* WRONG — should be 'glass-purple' */
```

The Phase 1 CSS migration (plan 01-02) established Glass Purple variables under `[data-theme='glass']`. Phase 2 theme infrastructure was written to use `'glass-purple'` as the theme value (both the `Theme` type and the runtime attribute). Neither phase caught that these two naming conventions are incompatible.

**Fix required:** Change `[data-theme='glass']` to `[data-theme='glass-purple']` in `app/src/index.css`.

This is a one-character-addition fix, but it is a blocker — without it, no Glass Purple visual appearance is possible.

### What IS Working Correctly

The following infrastructure is correctly implemented and will function immediately once the CSS selector is fixed:

- `Theme` type uses `'glass-purple'` as the value
- `getInitialTheme()` returns `'glass-purple'` for dark mode users / saved preference
- FOUC script sets `data-theme="glass-purple"` before React mounts
- `ThemeContext` useEffect writes `data-theme="glass-purple"` on toggle
- `ThemeContext` writes `glass-purple` to localStorage
- `ThemeToggle` calls `toggleTheme()` which triggers the full chain
- Both layout headers render `ThemeToggle` correctly
- Build and typecheck pass

---

## Gaps Summary

**One gap, two success criteria blocked.**

The CSS selector `[data-theme='glass']` in `app/src/index.css` does not match the attribute value `glass-purple` written by the JavaScript runtime. This single mismatch prevents Glass Purple from ever visually activating, making the toggle button mechanically functional but visually inert.

Fix: In `app/src/index.css`, change line 34 from `[data-theme='glass']` to `[data-theme='glass-purple']`.

After this fix, all automated checks should pass. Three success criteria (immediate switch, no-FOUC reload, system preference detection) still require human visual verification in a browser.

---

_Verified: 2026-02-24T18:10:00Z_
_Verifier: Claude (gsd-verifier)_
