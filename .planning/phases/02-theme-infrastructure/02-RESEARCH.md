# Phase 2: Theme Infrastructure - Research

**Researched:** 2026-02-24
**Domain:** React Context + localStorage persistence + FOUC prevention + Sun/Moon toggle
**Confidence:** HIGH

---

## Summary

Phase 2 builds the runtime theme-switching infrastructure on top of the CSS variable foundation laid in Phase 1. The deliverables are: a `ThemeProvider` React context, a `useTheme()` hook, a FOUC-prevention inline script in `index.html`, system-preference detection on first visit, and a `ThemeToggle` sun/moon button placed in both the admin layout header and student layout header.

The approach uses `data-theme` attribute on `document.documentElement` rather than Tailwind's `.dark` class convention. This is a deliberate choice documented in the prior architecture research: named themes (`daylight` / `glass-purple`) are unambiguous and avoid conflicts with `prefers-color-scheme` media queries. The CSS variable selectors from Phase 1 (`[data-theme="glass-purple"] { ... }`) activate automatically when the attribute is set — zero JavaScript re-renders occur for styled components.

The FOUC prevention requires an inline synchronous script in `index.html` `<head>`. This is the single most critical correctness constraint for this phase: if the script is missing or placed after the CSS module import, users with Glass Purple saved in localStorage will see a white flash on every page load. The ThemeContext initializer must also read localStorage synchronously (via lazy `useState` initializer, not `useEffect`) to prevent a mismatched state between the DOM attribute set by the script and the React state.

**Primary recommendation:** Implement `ThemeProvider` + FOUC script as a single atomic unit — they are two halves of the same correctness guarantee. Never ship one without the other.

---

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                                             | Research Support                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| THM-01 | ThemeContext provider exposes `theme` state and `setTheme` function via React context                   | Pattern 1 (ThemeProvider + useTheme hook); lazy useState initializer pattern                                 |
| THM-02 | Theme persists to localStorage and loads on initialization without server round-trip                    | localStorage sync in lazy useState + useEffect write; try/catch for private browsing                         |
| THM-03 | FOUC prevention inline script in index.html sets `data-theme` attribute on `<html>` before React mounts | Inline script pattern; must precede CSS import in `<head>`; no-IIFE required                                 |
| THM-04 | System preference detection on first visit — users with `prefers-color-scheme: dark` get Glass Purple   | `window.matchMedia('(prefers-color-scheme: dark)').matches` fallback in FOUC script and useState initializer |
| THM-05 | Sun/Moon toggle button switches between Daylight and Glass Purple themes                                | ThemeToggle component with lucide-react Sun/Moon icons; calls `toggleTheme()`                                |
| THM-06 | Toggle placed in admin sidebar header and student page header                                           | Both `AdminLayout.tsx` and `StudentLayout.tsx` import and render ThemeToggle                                 |

</phase_requirements>

---

## Standard Stack

### Core

| Library           | Version                      | Purpose                              | Why Standard                                                        |
| ----------------- | ---------------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| React Context API | 19.1.0 (built-in)            | Global theme state distribution      | No additional dependency; purpose-built for cross-tree shared state |
| localStorage API  | Browser-native               | Persist theme across sessions        | Synchronous read enables FOUC-free init; no round-trip              |
| lucide-react      | ^0.513.0 (already installed) | Sun and Moon icons for toggle button | Already in project; comprehensive, tree-shaken icon set             |

### Supporting

| Library           | Version        | Purpose                            | When to Use                                              |
| ----------------- | -------------- | ---------------------------------- | -------------------------------------------------------- |
| window.matchMedia | Browser-native | Detect system dark mode preference | First-visit only; used when no localStorage value exists |

### Alternatives Considered

| Instead of                | Could Use                    | Tradeoff                                                                                                                                                   |
| ------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Context             | Zustand store                | Zustand adds no value here; theme is simple shared state with no async operations; Context is zero-overhead for 2-value state                              |
| `data-theme` attribute    | `.dark` CSS class            | `.dark` class is shadcn/ui's convention but creates ambiguity with OS preference media queries; `data-theme` with named themes is explicit and future-safe |
| Lazy useState initializer | `useEffect` for initial read | `useEffect` runs after paint — causes extra render cycle and potential FOUC; lazy initializer runs synchronously before first render                       |

**Installation:** No new packages required. All dependencies (React, lucide-react) are already in `app/package.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
app/src/
├── lib/
│   └── theme.ts              # type Theme = 'daylight' | 'glass-purple'; STORAGE_KEY constant
├── contexts/
│   └── ThemeContext.tsx       # ThemeProvider + ThemeContext + useTheme hook
├── components/
│   ├── ThemeToggle.tsx        # Sun/Moon button, calls toggleTheme()
│   ├── AdminLayout.tsx        # UPDATED: render ThemeToggle in header area
│   └── StudentLayout.tsx      # UPDATED: render ThemeToggle in header
└── main.tsx                   # UPDATED: wrap App in <ThemeProvider>
app/
└── index.html                 # UPDATED: FOUC prevention inline script in <head>
```

**Note:** The `contexts/` directory does not currently exist in the codebase. Creating it is part of this phase.

---

### Pattern 1: ThemeProvider with Lazy useState Initializer

**What:** The ThemeProvider reads localStorage synchronously during React's initial render pass (before paint) using a lazy `useState` initializer function. It then syncs the DOM attribute and localStorage in a `useEffect`.

**When to use:** Any time theme state must be consistent with the pre-React FOUC script on first render.

**Example:**

```typescript
// Source: .planning/research/ARCHITECTURE.md, Pattern 1
const STORAGE_KEY = 'mededprep-theme';
type Theme = 'daylight' | 'glass-purple';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (saved === 'daylight' || saved === 'glass-purple') return saved;
      // System preference fallback on first visit
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'glass-purple' : 'daylight';
    } catch {
      return 'daylight';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private browsing — fail silently
    }
  }, [theme]);

  const toggleTheme = () =>
    setThemeState((t) => (t === 'daylight' ? 'glass-purple' : 'daylight'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

---

### Pattern 2: FOUC Prevention Inline Script

**What:** A synchronous inline `<script>` in `<head>` reads localStorage and sets `data-theme` on `<html>` BEFORE any CSS or React loads. This prevents the white flash that occurs when a user with Glass Purple refreshes the page.

**When to use:** Required whenever React-controlled theme state could lag behind first paint. Since this is a client-side SPA (not SSR), the script fires before Vite's CSS module is applied.

**Critical placement:** The script must come BEFORE the Vite module script entry point. In `index.html`, place it as the FIRST element in `<head>`, before any stylesheet links.

**Example:**

```html
<!-- app/index.html — inside <head>, FIRST child -->
<script>
  (function () {
    var key = 'mededprep-theme';
    try {
      var saved = localStorage.getItem(key);
      if (saved === 'glass-purple' || saved === 'daylight') {
        document.documentElement.setAttribute('data-theme', saved);
        return;
      }
    } catch (e) {}
    // First visit: check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'glass-purple');
    } else {
      document.documentElement.setAttribute('data-theme', 'daylight');
    }
  })();
</script>
```

**Why IIFE:** The IIFE (`(function() { ... })()`) prevents variable leakage into global scope. The `var` (not `const`) inside the IIFE is intentional — ES5 syntax ensures compatibility with any browser that can render this SPA, and avoids `let`/`const` TDZ edge cases in inline scripts.

---

### Pattern 3: ThemeToggle Component

**What:** A single icon button that toggles between Sun (Daylight) and Moon (Glass Purple) icons. No dropdown, no label — sun/moon is universal muscle memory.

**When to use:** Placed in AdminLayout header area and StudentLayout header.

**Example:**

```typescript
// Source: .planning/research/FEATURES.md — Theme Toggle UX section
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === 'daylight' ? 'Switch to Glass Purple theme' : 'Switch to Daylight theme'}
    >
      {theme === 'daylight' ? (
        <Moon className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Sun className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
```

**Accessibility note:** The `aria-label` must describe the ACTION (what will happen on click), not the current state. "Switch to Glass Purple" when currently in Daylight is correct. "Glass Purple mode active" would be wrong.

---

### Pattern 4: ThemeProvider Placement in main.tsx

**What:** `ThemeProvider` wraps the entire React tree inside `QueryClientProvider` and `BrowserRouter` but outside `App`. The `Toaster` (sonner) can remain inside or outside — it uses its own theme-agnostic styling.

**Example:**

```typescript
// app/src/main.tsx
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <App />
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
```

**Placement rationale:** Inside `BrowserRouter` allows future theme-related routing hooks if needed. Outside `App` ensures all routes inherit the theme state.

---

### Pattern 5: Tailwind Config — No `darkMode` Setting Required

**What:** This project does NOT use Tailwind's `darkMode: 'class'` convention. Theme switching is done via `[data-theme="glass-purple"]` CSS selectors in `index.css`, NOT via Tailwind `dark:` utility classes. The tailwind.config.js does not need a `darkMode` setting.

**Verification:** The current `tailwind.config.js` has no `darkMode` key. This is correct. Do not add it.

**Implication for the code sweep:** Any use of `dark:` Tailwind utilities in component files is incorrect for this project and should not be introduced. The `[data-theme]` CSS selectors in `index.css` own all dark/glass theming.

---

### Anti-Patterns to Avoid

- **Anti-Pattern A: useEffect for initial theme read.** `useEffect` fires after paint. Reading localStorage in `useEffect` causes one render cycle with the wrong (default) theme before the correct theme loads. Use lazy `useState` initializer instead.
- **Anti-Pattern B: Toggling `.dark` class on `document.body`.** Tailwind's `darkMode: 'class'` looks at `<html>` (`document.documentElement`), not `<body>`. This project uses `data-theme` attributes anyway, so neither class nor body is relevant — but don't accidentally mix them.
- **Anti-Pattern C: Missing try/catch on localStorage.** In private/incognito browsing on iOS Safari, `localStorage.getItem()` throws a `SecurityError`. Every localStorage call must be inside a `try/catch`. The FOUC script, the `useState` initializer, and the `useEffect` write must all have `try/catch` wrappers.
- **Anti-Pattern D: Calling `useTheme()` in styled components.** Components like `Button`, `Card`, and `Input` must NOT import `useTheme()`. They should be styled purely via CSS variables and `[data-theme]` selectors. Only components with behavioral differences (like `ThemeToggle`, and later `TakeAssessment` for SurveyJS) should consume the context.
- **Anti-Pattern E: Placing the FOUC script after the Vite module script.** The script MUST fire before any CSS or React loads. Placing it at the end of `<body>` or after `<script type="module">` defeats its purpose entirely.
- **Anti-Pattern F: Using `darkMode: 'class'` in tailwind.config.** This would change how Tailwind processes `dark:` utilities (looking for a `.dark` class on `<html>`). This project uses `data-theme` selectors in raw CSS, not Tailwind `dark:` utilities. Never add `darkMode: 'class'` to the config.

---

## Don't Hand-Roll

| Problem                          | Don't Build                       | Use Instead                                                   | Why                                                                                                   |
| -------------------------------- | --------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Theme storage key naming         | Custom key naming scheme          | Use `'mededprep-theme'` constant in `lib/theme.ts`            | Avoids collision with Zustand's `'auth-storage'` key; single source prevents drift                    |
| Sun/Moon icons                   | Custom SVG paths inline           | `lucide-react` Sun and Moon icons (already installed)         | Consistent sizing, accessible, tree-shaken                                                            |
| Toggle button styling            | Custom button styles              | shadcn Button with `variant="ghost" size="icon"`              | Already styled, focus states handled, disabled states handled                                         |
| TypeScript type for theme values | Inline string literals everywhere | `type Theme = 'daylight' \| 'glass-purple'` in `lib/theme.ts` | Single source of truth; prevents typos across ThemeProvider, ThemeToggle, future SurveyJS integration |

**Key insight:** The entire Phase 2 implementation requires zero new npm packages. All building blocks (React Context, localStorage, lucide-react, shadcn Button) are already present in the project.

---

## Common Pitfalls

### Pitfall 1: FOUC from React-Side Theme Init Latency

**What goes wrong:** User with Glass Purple saved in localStorage refreshes. The page paints with Daylight (white background) for ~50-200ms before React mounts and the `useEffect` sets `data-theme="glass-purple"`. Visible white flash.
**Why it happens:** React module loading + parsing + execution takes time. CSS applies immediately. Without a synchronous pre-React script, the CSS has no `data-theme` attribute to match against on first paint.
**How to avoid:** The inline script in `index.html` `<head>` sets `data-theme` before any CSS or React loads. The lazy `useState` initializer in ThemeProvider ensures React's initial state matches what the script set — no re-paint needed.
**Warning signs:** Toggle to Glass Purple, hard-refresh (Cmd+Shift+R), observe the first ~100ms — any white frame is a FOUC failure.

### Pitfall 2: localStorage SecurityError in Private Browsing

**What goes wrong:** On iOS Safari in Private mode, `localStorage.getItem()` throws a `SecurityError` rather than returning `null`. Without a try/catch, this crashes the FOUC script (silent JS error, partial execution) and the React initializer (runtime exception in ThemeProvider).
**Why it happens:** Safari's private browsing disables localStorage access entirely and throws on access rather than returning null.
**How to avoid:** Every localStorage call (in FOUC script, in useState initializer, in useEffect) must be in try/catch. Catch block should fall back to `'daylight'` silently.
**Warning signs:** Theme fails to apply in Safari private window; React error boundary fires on initial load.

### Pitfall 3: `data-theme` Attribute Set on Wrong Element

**What goes wrong:** `document.body.setAttribute('data-theme', ...)` is used instead of `document.documentElement.setAttribute(...)`. CSS selectors `[data-theme="glass-purple"]` in `index.css` target the `<html>` element's attribute scope — child selectors like `[data-theme="glass-purple"] body` will not match if the attribute is on `<body>` directly.
**Why it happens:** `document.body` is more commonly used for class manipulation; developers default to it.
**How to avoid:** Always use `document.documentElement` (which is `<html>`). The CSS in `index.css` and the FOUC script must both target the same element.
**Warning signs:** Theme colors don't change despite toggle working (data attribute visible on `<body>` in DevTools, not `<html>`).

### Pitfall 4: ThemeProvider Placed Outside BrowserRouter Breaks Future Router Hooks

**What goes wrong:** ThemeProvider is placed outside BrowserRouter in `main.tsx`. While this technically works for Phase 2, it prevents future patterns where `useTheme()` is used alongside `useNavigate()` or `useLocation()` in the same component.
**Why it happens:** Provider order in main.tsx is often arbitrary.
**How to avoid:** Place ThemeProvider INSIDE BrowserRouter but OUTSIDE App (see Pattern 4 above).
**Warning signs:** `useNavigate()` called outside BrowserRouter errors if ThemeProvider-wrapped components try to use router hooks.

### Pitfall 5: System Preference Detection Missing from FOUC Script

**What goes wrong:** The FOUC script only reads localStorage, not `matchMedia`. First-time visitors with system dark mode get a white flash because there's no localStorage key yet, and the script defaults to `'daylight'`, then React's initializer detects `prefers-color-scheme: dark` and sets Glass Purple — causing a flash.
**Why it happens:** Developers implement the localStorage persistence correctly but miss the first-visit system preference path in the FOUC script.
**How to avoid:** Both the FOUC script AND the `useState` initializer must check `window.matchMedia('(prefers-color-scheme: dark)').matches` as a fallback when no localStorage key is present. They must use identical logic so there is no DOM/React state mismatch.
**Warning signs:** New users in system dark mode see a flash; existing Glass Purple users do not.

---

## Code Examples

### lib/theme.ts

```typescript
// Source: .planning/research/ARCHITECTURE.md — Recommended Project Structure
export type Theme = 'daylight' | 'glass-purple';
export const THEME_STORAGE_KEY = 'mededprep-theme';
export const THEMES: Theme[] = ['daylight', 'glass-purple'];

export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (saved === 'daylight' || saved === 'glass-purple') return saved;
  } catch {
    // localStorage unavailable (private browsing, security policy)
  }
  // First visit: respect system preference
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'glass-purple';
    }
  } catch {
    // matchMedia unavailable
  }
  return 'daylight';
}
```

### Full FOUC script for index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MedEdPrep</title>
    <script>
      (function () {
        var key = 'mededprep-theme';
        var theme = 'daylight';
        try {
          var saved = localStorage.getItem(key);
          if (saved === 'glass-purple' || saved === 'daylight') {
            theme = saved;
          } else if (
            window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches
          ) {
            theme = 'glass-purple';
          }
        } catch (e) {}
        document.documentElement.setAttribute('data-theme', theme);
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### ThemeToggle placement in AdminLayout.tsx

```tsx
// AdminLayout.tsx — existing header area, add ThemeToggle
import ThemeToggle from '@/components/ThemeToggle';

// In the header flex row alongside user email and Sign Out button:
<div className="flex items-center gap-4">
  <span className="text-sm text-muted-foreground">{user?.email}</span>
  <ThemeToggle />
  <Button variant="outline" size="sm" onClick={logout}>
    Sign Out
  </Button>
</div>;
```

### ThemeToggle placement in StudentLayout.tsx

```tsx
// StudentLayout.tsx — existing nav flex row, add ThemeToggle
import ThemeToggle from '@/components/ThemeToggle';

// In the header items div alongside logout button:
<div className="flex items-center gap-3">
  <span className="hidden text-sm text-muted-foreground sm:inline">
    {student?.firstName} {student?.lastName}
  </span>
  <ThemeToggle />
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleLogout}
    aria-label="Log out of student portal"
  >
    <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
    Logout
  </Button>
</div>;
```

---

## State of the Art

| Old Approach                        | Current Approach                   | When Changed                                                       | Impact                                                    |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| `darkMode: 'class'` (Tailwind dark) | `[data-theme]` attribute selectors | shadcn/ui v2 theming guidance (2024)                               | Named themes; no conflict with OS dark mode media queries |
| `useEffect` for localStorage init   | Lazy `useState` initializer        | React 18+ best practices                                           | Eliminates one render cycle; no flicker on init           |
| `.dark` class on `<html>`           | `data-theme` attribute on `<html>` | Named-theme pattern matured (2024-2025)                            | Supports >2 themes naturally; explicit in DevTools        |
| No FOUC prevention                  | Inline blocking script in `<head>` | Popularized by Josh W. Comeau's dark mode article (widely adopted) | Eliminates white flash completely for SPA dark themes     |

**Deprecated/outdated:**

- `window.__theme` global variable pattern: Used in older FOUC guides; unnecessary when the `data-theme` attribute is set directly on `<html>`.
- `localStorage.getItem` in `componentDidMount`: Class component era pattern; does not apply to React hooks.
- Tailwind `dark:` utility classes: NOT applicable to this project. The `[data-theme]` selector approach in `index.css` handles all dark/glass styling. Do not add `dark:` variants to component files.

---

## Open Questions

1. **Will Phase 1 be complete before Phase 2 executes?**
   - What we know: Phase 2 depends on Phase 1 (`[data-theme="glass-purple"]` CSS variables must exist in `index.css` before ThemeProvider sets the attribute)
   - What's unclear: Phase 1 plan does not yet exist; it's possible Phase 2 is being planned alongside Phase 1
   - Recommendation: The planner should note this dependency. Phase 2 tasks can be planned now, but execution must wait for Phase 1 completion (or be built as a single combined plan). The FOUC script itself doesn't depend on Phase 1's CSS (it just sets an attribute), but the visible result of setting that attribute depends entirely on Phase 1's `[data-theme]` CSS existing.

2. **Should `getInitialTheme()` be co-located in `ThemeContext.tsx` or extracted to `lib/theme.ts`?**
   - What we know: FEATURES.md and ARCHITECTURE.md both recommend `lib/theme.ts` for the `Theme` type; the `getInitialTheme` function is a pure utility
   - What's unclear: Whether the test infrastructure can import `lib/theme.ts` independently to unit test `getInitialTheme`
   - Recommendation: Extract to `lib/theme.ts`. This makes the function independently testable and keeps `ThemeContext.tsx` focused on React wiring.

3. **Does the Toaster (sonner) need theme-awareness?**
   - What we know: Sonner's `Toaster` component uses its own CSS that is independent of Tailwind tokens. It is currently placed in `main.tsx` outside `ThemeProvider`.
   - What's unclear: Whether Glass Purple's dark background causes Sonner's default light toast styles to create harsh contrast
   - Recommendation: Leave Sonner as-is for Phase 2. If visual contrast is poor in Glass Purple, it can be addressed in Phase 4/5's color sweep by adding `theme="dark"` prop to `<Toaster>` conditionally.

---

## Sources

### Primary (HIGH confidence)

- `.planning/research/ARCHITECTURE.md` — Full architecture decision record including ThemeProvider pattern, `data-theme` vs `.dark` class analysis, `useState` lazy initializer pattern, placement in `main.tsx`, and CSS variable organization
- `.planning/research/FEATURES.md` — Feature research including toggle UX decisions (sun/moon, single button), FOUC prevention script, system preference detection, placement requirements
- `.planning/research/PITFALLS.md` — Pitfall 4 (FOUC), localStorage SecurityError, `data-theme` element selection, `useEffect` vs useState init patterns — all directly applicable to Phase 2
- Direct codebase inspection: `app/index.html` (no existing script blocks), `app/src/main.tsx` (current provider tree), `app/src/components/AdminLayout.tsx` (header structure for toggle placement), `app/src/components/StudentLayout.tsx` (header structure for toggle placement), `app/src/components/ui/button.tsx` (ghost/icon variant available), `app/package.json` (lucide-react already installed)

### Secondary (MEDIUM confidence)

- Josh W. Comeau "The Quest for the Perfect Dark Mode" (referenced in FEATURES.md) — FOUC inline script pattern; widely cited and aligned with Tailwind documentation
- Tailwind CSS Dark Mode docs (https://tailwindcss.com/docs/dark-mode) — confirms `darkMode: 'class'` is not needed for `data-theme` attribute approach; the project correctly omits this setting

### Tertiary (LOW confidence)

- None — all Phase 2 patterns are either directly verified in the codebase or cross-referenced between the existing research documents and official docs

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — zero new dependencies; React Context, localStorage, and lucide-react are all already installed and in active use
- Architecture: HIGH — ThemeProvider + `data-theme` pattern is extensively documented in prior research with direct codebase verification
- Pitfalls: HIGH — localStorage SecurityError, FOUC mechanics, and element targeting issues are all verified against official browser behavior and prior research

**Research date:** 2026-02-24
**Valid until:** 2026-03-31 (stable APIs; React Context and localStorage have no known upcoming breaking changes)
