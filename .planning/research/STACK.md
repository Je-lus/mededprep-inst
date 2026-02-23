# Stack Research

**Domain:** CSS theming and dark mode system — React 19 + Tailwind CSS 3 + shadcn/ui
**Researched:** 2026-02-23
**Confidence:** HIGH (verified with official docs and multiple sources)
**Scope:** Subsequent milestone — adding 2-theme system (Daylight + Glass Purple) to existing app

---

## Decision Summary

This research targets a specific, scoped question: how to implement a 2-theme system on top of the existing stack (Tailwind CSS 3.4.x, shadcn/ui with HSL CSS variables, React 19, Vite). The conclusions below are prescriptive — one approach per decision, with clear rationale for why alternatives were ruled out.

---

## CSS Variable Format: Use Raw Hex

### Decision: Migrate from HSL components to raw hex values

**Current state:** The app uses Tailwind CSS 3's shadcn/ui convention — CSS variables store bare HSL channel values (e.g., `--primary: 221 76% 46%`) and consumption wraps them in `hsl()` (e.g., `hsl(var(--primary))`).

**Target state:** Raw hex values stored directly in CSS variables (e.g., `--primary: #1b5fd0`) consumed without a wrapper function (e.g., `var(--primary)`).

**Why raw hex over HSL components (current format):**

- HSL components work for Tailwind's `hsl(var(--x))` pattern but are opaque — `221 76% 46%` is not human-readable without mental conversion. When defining two complete theme palettes, readability matters enormously during maintenance.
- The "split HSL" format (`--primary: H S% L%` without `hsl()`) is a Tailwind-specific workaround that breaks if you try to use the variable outside of a `hsl()` call. This creates friction when passing colors to SurveyJS theme APIs, which expect standard color values.
- Raw hex is universally consumable: `var(--primary)` works in inline styles, SurveyJS JSON config, CSS `background`, and Tailwind utilities — without any wrapper function.

**Why raw hex over oklch:**

- OKLCH is the shadcn/ui v2 default as of late 2024/early 2025, but **only when paired with Tailwind CSS v4**. The project is on Tailwind CSS 3.4.17 and will not be upgrading to v4 during this milestone.
- Tailwind CSS 3.x does not have native oklch utility support in its default configuration pipeline. Generating oklch-based utility classes requires additional tooling.
- Hex is universally supported, human-readable, and trivially copy-pasted from Figma/design tools. For a 2-theme system with ~15 tokens per theme, there is no perceptual uniformity advantage that would justify oklch's added complexity on Tailwind v3.

**Why raw hex over OKLCH for Tailwind v3 specifically:**

Tailwind v4 introduced OKLCH as its color space partly because v4 redefined how `@theme` processes colors. In v3, the `extend.colors` block feeds into PostCSS which generates utility classes — this pipeline is optimized for hex and hsl(), not oklch. Using oklch in v3 Tailwind config colors would require custom PostCSS plugins or manual utility definitions.

**Confidence:** HIGH — verified against Tailwind v3 docs, shadcn/ui docs (v3 vs v4 split confirmed), official shadcn/ui changelog.

### CSS variable format pattern to use

```css
/* index.css — theme tokens as raw hex */
:root {
  /* Daylight theme (default) */
  --background: #ffffff;
  --foreground: #0f172a;
  --primary: #1b5fd0;
  --primary-foreground: #ffffff;
  /* ... all semantic tokens ... */
}

[data-theme='glass'] {
  /* Glass Purple theme */
  --background: #0f0d1a;
  --foreground: #e8e4f0;
  --primary: #9b8ec4;
  --primary-foreground: #ffffff;
  /* ... all semantic tokens ... */
}
```

### Tailwind config pattern to use

```javascript
// tailwind.config.js — consume via var() not hsl(var())
export default {
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        // ... all semantic tokens
      },
    },
  },
};
```

**This is the atomic migration:** index.css variables change format, tailwind.config.js references change from `hsl(var(--x))` to `var(--x)`, all `primary-500`/`primary-100`/`primary-50` hardcoded class usages get replaced with semantic token classes. Must happen in a single commit — any partial state breaks the entire app.

---

## Dark Mode Strategy: Tailwind `selector` Strategy with `data-theme` Attribute

### Decision: Use `darkMode: ['selector', '[data-theme="glass"]']` in Tailwind config

**Why `selector` strategy over `media` strategy:**

The `media` strategy triggers dark mode based solely on `prefers-color-scheme`. It cannot be manually overridden by the user — if the OS is in light mode and the user wants Glass Purple, `media` strategy won't apply `dark:` utilities. Since this app has a manual theme toggle, `media` strategy is unsuitable.

**Why `selector` with `data-theme` attribute over `class` strategy:**

- The `class` strategy adds `.dark` to `<html>` — this works for binary light/dark, but since this project maps themes as `daylight` and `glass`, using `.dark` is semantically misleading. The `data-theme` attribute is self-documenting.
- Using `data-theme="glass"` makes the theme name explicit in the DOM, which is useful for debugging, SurveyJS integration (can read the attribute to apply the right theme), and future extensibility.
- In Tailwind CSS 3.4.1+, `selector` strategy was introduced to replace the older `class` strategy. It supports arbitrary selectors including attribute selectors.
- `data-theme` attributes are the standard multi-theme pattern in CSS ecosystems (used by DaisyUI, many design systems, and recommended by Tailwind v4 docs for multi-theme).

**Configuration:**

```javascript
// tailwind.config.js
export default {
  darkMode: ['selector', '[data-theme="glass"]'],
  // ...
};
```

This means `dark:` utility classes activate whenever `[data-theme="glass"]` is present on an ancestor element (applied to `<html>`).

**Confidence:** HIGH — verified against Tailwind CSS v3 dark mode docs (v3.tailwindcss.com/docs/dark-mode), selector strategy release notes.

---

## Theme Persistence: Inline Script in `index.html` + React Context

### Decision: Inline `<script>` in `<head>` for FOUC prevention + React Context with `localStorage`

**The FOUC problem:**

Without special handling, a React app will render with the default theme, then after JavaScript hydrates, read `localStorage` and switch to the saved theme. This causes a visible flash (FOUC — Flash of Unstyled Content). This is especially bad for Glass Purple: a white flash followed by a dark theme is jarring.

**Solution: Inline script in `index.html` before React loads**

```html
<!-- index.html — in <head>, before any CSS or JS imports -->
<script>
  (function () {
    var stored = localStorage.getItem('mededprep-theme');
    var theme = stored === 'glass' ? 'glass' : 'daylight';
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

This runs synchronously before the browser paints, so the correct `data-theme` attribute is on `<html>` before any CSS is processed. Zero flash.

**Why localStorage over cookies:**

- This is a client-side Vite/React SPA — no SSR, no server-side rendering. localStorage is the correct choice for client-only preference storage.
- Cookies would require backend changes and add complexity with no benefit for an SPA.
- The SSR hydration concern that makes cookies preferable in Next.js does not apply here.

**Why NOT use `next-themes`:**

- `next-themes` is designed for Next.js with its specific App Router/Pages Router patterns. This is a Vite + React Router app — using `next-themes` would add an SSR-focused dependency to solve a client-side problem.
- A custom ThemeContext is ~30 lines of code and doesn't require a dependency.

**React Context pattern:**

```typescript
// src/lib/theme.tsx
type Theme = 'daylight' | 'glass';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: 'daylight', setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('mededprep-theme');
    return stored === 'glass' ? 'glass' : 'daylight';
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('mededprep-theme', t);
    document.documentElement.setAttribute('data-theme', t);
  };

  // Sync on mount (in case inline script and stored value differ)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
```

**System preference detection:** NOT recommended for this milestone. The project spec calls for a simple sun/moon toggle between two named themes. Adding `prefers-color-scheme` detection introduces a third "system" state that complicates the UX without clear benefit (instructors are typically using desktop/institutional devices where system preferences are less relevant than explicit choice). This can be added later if requested.

**Confidence:** HIGH — inline script pattern is documented in Tailwind CSS docs example, widely verified across multiple sources.

---

## Glass/Glassmorphism Effects: `backdrop-filter: blur()` with Careful Scoping

### Decision: Use `backdrop-blur` Tailwind utilities, scoped to specific components, not large areas

**Browser support (2025):** `backdrop-filter` has ~95% global browser support. Chrome 76+, Edge 79+, Safari 9+ (with `-webkit-` prefix), Firefox 103+. Tailwind includes the `-webkit-` prefix automatically.

**Performance implications (critical):**

- `backdrop-filter: blur()` triggers GPU compositing. Each element with this property creates a separate compositor layer.
- On high-resolution displays (2560x1440+), the GPU workload scales with pixel area — a large blurred element on a 4K screen can cause significant frame drops.
- Nesting multiple `backdrop-filter` elements is multiplicatively expensive. Never stack glassmorphism inside glassmorphism.
- The shadcn/ui team themselves documented this issue (GitHub issue #327): `backdrop-blur-sm` on overlays (modals, sheets) caused noticeable lag on Chromium browsers at high resolutions. The fix was removing or reducing the blur.

**Guidance:**

- Apply `backdrop-blur` only on: sidebar, cards, and modals in Glass Purple theme — not on full-page backgrounds or large containers.
- Keep blur radius at `backdrop-blur` (8px) or `backdrop-blur-sm` (4px) — avoid `backdrop-blur-xl` or larger.
- The Glass Purple background itself should use CSS `background` with gradients, NOT `backdrop-filter`. The blur applies to the frosted-glass card elements layered on top.
- Test on a mid-range device at 1080p before declaring performance acceptable.

**Graceful degradation:** Use `@supports (backdrop-filter: blur(1px))` in CSS if needed, though with 95% support, `@supports` fallbacks are optional for this internal tool.

**Confidence:** MEDIUM — browser support figures from MDN-cited sources; performance issues verified from shadcn/ui GitHub issue #327 (official project repo, credible source). Specific blur radius performance thresholds are from community sources, not benchmarks.

---

## shadcn/ui Theming: CSS Variable Remapping Only

### Decision: Do NOT migrate shadcn/ui to v4/oklch. Remap existing CSS variable tokens to hex values.

**What shadcn/ui does natively:**

shadcn/ui does not have its own theme engine — it is a code generation tool that scaffolds components using Tailwind utility classes and CSS variable tokens. The "theming" is entirely done by:

1. Defining CSS variable values in `:root` / `.dark` (or in our case `:root` / `[data-theme="glass"]`)
2. Mapping those CSS variables to Tailwind utility classes in `tailwind.config.js`

Every shadcn/ui component already uses semantic tokens like `bg-background`, `text-foreground`, `border-border`, `bg-primary`, etc. Changing the CSS variable values is the entire theming mechanism.

**Current shadcn/ui state vs what we need:**

| Aspect          | Current (shadcn/ui + Tailwind v3 HSL) | Target (raw hex)       |
| --------------- | ------------------------------------- | ---------------------- |
| CSS var format  | `--primary: 221 76% 46%`              | `--primary: #1b5fd0`   |
| Tailwind config | `'hsl(var(--primary))'`               | `'var(--primary)'`     |
| Dark selector   | None (no dark mode configured)        | `[data-theme="glass"]` |
| Glass Purple    | Not present                           | Add full token set     |

**What shadcn/ui v2 (latest, 2025) changes vs what we use:**

As of late 2024, shadcn/ui defaulted to OKLCH and Tailwind v4 for new projects. However:

- Existing apps with Tailwind v3 are explicitly supported — "your existing apps with Tailwind v3 and React 18 will still work"
- The component code generated for v3 apps continues to use HSL-component variables with `hsl(var())` wrappers
- Migrating to oklch/v4 is entirely separate from the theming milestone and out of scope

**The raw hex migration breaks nothing in shadcn/ui components** because those components reference Tailwind utility class names (e.g., `bg-primary`), not CSS variable syntax directly. Changing how `primary` is resolved in `tailwind.config.js` from `hsl(var(--primary))` to `var(--primary)` is transparent to component code.

**Glass Purple token additions needed:**

The existing shadcn/ui token set covers the basics. Glass Purple requires a few additions:

- `--glass-surface`: semi-transparent card background (`rgba(255,255,255,0.08)`)
- `--glass-border`: subtle border for glass cards (`rgba(255,255,255,0.12)`)
- `--glass-glow`: primary color glow for interactive elements
- `--sidebar-background`: dedicated sidebar background (separate from main background)

These are additive CSS variables — they don't replace any shadcn/ui tokens, so no component regressions.

**Confidence:** HIGH — shadcn/ui theming mechanism verified from official docs; v3/v4 split confirmed by shadcn/ui Tailwind v4 migration page.

---

## Recommended Stack (Summary Table)

### Core Technologies (Existing — No Changes)

| Technology   | Version      | Purpose              | Status                                 |
| ------------ | ------------ | -------------------- | -------------------------------------- |
| React        | 19.1.0       | UI framework         | Existing — no change                   |
| Tailwind CSS | 3.4.17       | Utility CSS          | Existing — config update only          |
| shadcn/ui    | via Radix UI | Component primitives | Existing — new components added        |
| Zustand      | 5.0.9        | Client state         | Use for ThemeProvider or React Context |

### New Additions

| Technology            | Version | Purpose                   | Why                               |
| --------------------- | ------- | ------------------------- | --------------------------------- |
| ThemeContext (custom) | n/a     | Theme state + persistence | ~30 lines, no external dep needed |

**No new npm packages are required for the theming system.** Zustand already covers state management if you prefer to put theme state in the global store instead of a React Context. Either approach works — React Context is slightly simpler for a single piece of global state.

---

## Alternatives Considered

| Recommended                       | Alternative                            | Why Not                                                                                                                |
| --------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Raw hex CSS variables             | HSL component format (current)         | Opaque format, can't use `var()` directly without `hsl()` wrapper, problematic for SurveyJS color APIs                 |
| Raw hex CSS variables             | OKLCH                                  | Requires Tailwind v4; v3 pipeline not optimized for oklch; no perceptual uniformity benefit for 15 tokens              |
| `data-theme` attribute selector   | `.dark` class strategy                 | Less semantic for named themes; `.dark` on `<html>` implies a single dark/light binary rather than named themes        |
| `data-theme` attribute selector   | CSS media query `prefers-color-scheme` | Cannot be manually toggled; user must rely on OS setting                                                               |
| Custom ThemeContext               | `next-themes`                          | next-themes is SSR-focused (Next.js App Router); this is a pure client SPA with Vite — adds complexity without benefit |
| Custom ThemeContext               | `use-dark-mode` library                | Another external dep that does less than our custom context which needs to handle named themes (not just dark/light)   |
| Scoped `backdrop-blur`            | Full-page glass background             | Large-area backdrop-filter causes GPU lag at high resolutions (confirmed shadcn/ui issue #327)                         |
| Inline `<script>` FOUC prevention | `useLayoutEffect` in React             | `useLayoutEffect` runs after hydration, too late to prevent flash; inline script runs before browser paints            |

---

## What NOT to Use

| Avoid                                                | Why                                                                                                                                     | Use Instead                                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| OKLCH CSS variables                                  | Tailwind CSS 3.x has no native oklch pipeline support; requires Tailwind v4 upgrade                                                     | Raw hex values                                                                      |
| `hsl(var(--x))` format (current)                     | Requires color values to be stored as bare channels, breaks when `var()` is used outside `hsl()`, incompatible with SurveyJS color APIs | `var(--x)` with hex stored in CSS variable                                          |
| `prefers-color-scheme` media query as sole mechanism | Cannot be manually overridden; forces user to change OS setting to switch themes                                                        | `data-theme` attribute + inline script for system preference fallback               |
| `backdrop-filter: blur()` on large/full-page areas   | GPU-intensive; documented performance issues on high-res displays (shadcn/ui GitHub #327)                                               | Gradient backgrounds for large areas; backdrop-blur only on individual cards/modals |
| Tailwind v4 migration                                | Out of scope; breaking change that requires OKLCH migration, new @theme directive, removing tailwind.config.js                          | Stay on Tailwind v3.4.17                                                            |
| Copying portal theme CSS                             | Portal has known CSS bugs; 12-theme system has more complexity than needed                                                              | Write fresh 2-theme implementation                                                  |
| next-themes                                          | SSR-only benefit; adds unnecessary complexity to a Vite SPA                                                                             | Custom ThemeContext (30 lines) + inline script in index.html                        |

---

## Version Compatibility

| Package              | Version      | Theming Notes                                                                  |
| -------------------- | ------------ | ------------------------------------------------------------------------------ |
| tailwindcss          | 3.4.17       | `darkMode: ['selector', '...']` syntax available since 3.4.1                   |
| tailwindcss-animate  | current      | No impact from CSS variable format change                                      |
| shadcn/ui components | via Radix UI | Use semantic token class names — transparent to CSS variable format            |
| SurveyJS Core        | 2.5.10       | Cannot consume `hsl(var())` — needs raw color values; hex via `var(--x)` works |

---

## Installation

No new packages required for the theming system itself.

```bash
# New shadcn/ui components needed (from PROJECT.md requirements):
# Run from app/ directory
npx shadcn@latest add sheet
npx shadcn@latest add tooltip
npx shadcn@latest add scroll-area
npx shadcn@latest add popover
npx shadcn@latest add checkbox
npx shadcn@latest add switch
```

These are UI components, not theming infrastructure. The theme system itself (ThemeContext, CSS variables, Tailwind config) requires no new npm packages.

---

## Sources

- **Official Tailwind CSS v3 dark mode docs** — https://v3.tailwindcss.com/docs/dark-mode (selector strategy, custom selectors, localStorage pattern) — HIGH confidence
- **shadcn/ui theming docs** — https://ui.shadcn.com/docs/theming (CSS variable token system, cssVariables: true pattern) — HIGH confidence
- **shadcn/ui Tailwind v4 migration docs** — https://ui.shadcn.com/docs/tailwind-v4 (confirms v3 apps still supported, OKLCH is v4-only, HSL→OKLCH migration is separate) — HIGH confidence
- **shadcn/ui GitHub Discussion #1802** — HSL rationale discussion — MEDIUM confidence (community discussion)
- **shadcn/ui GitHub Issue #327** — backdrop-filter performance with backdrop-blur-sm — HIGH confidence (official repo, documented bug with user-verified fix)
- **MDN backdrop-filter** — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter (browser support) — HIGH confidence
- **Glassmorphism performance research** — Multiple community sources (playground.halfaccessible.com, blog.openreplay.com) — MEDIUM confidence
- **FOUC prevention pattern** — Tailwind CSS docs example + multiple verified community implementations — HIGH confidence

---

_Stack research for: CSS theming / dark mode — mededprep-inst_
_Researched: 2026-02-23_
