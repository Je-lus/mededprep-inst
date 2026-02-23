# Architecture Research

**Domain:** CSS theme system migration + dual-theme addition (React 19 + Tailwind CSS 3 + shadcn/ui)
**Researched:** 2026-02-23
**Confidence:** HIGH (codebase verified + official docs)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HTML Element                                 │
│  data-theme="daylight" | data-theme="glass-purple"                  │
├─────────────────────────────────────────────────────────────────────┤
│                      index.css (CSS Layer)                           │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────┐  │
│  │   :root defaults  │  │ [data-theme=      │  │  .sd-root-modern │  │
│  │  (Daylight hex)  │  │  glass-purple]    │  │  * { revert }    │  │
│  └──────────────────┘  └───────────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                    tailwind.config.js                                │
│  colors: { primary: 'var(--primary)', ... }  (no hsl() wrapper)     │
├─────────────────────────────────────────────────────────────────────┤
│                       ThemeProvider                                  │
│  (wraps App in main.tsx, reads/writes localStorage + data-theme)     │
├───────────────────────────┬─────────────────────────────────────────┤
│       AdminLayout          │          StudentLayout                   │
│  (AppShell: sidebar +      │  (header-only + theme toggle)           │
│   theme toggle)            │                                         │
├───────────────────────────┴─────────────────────────────────────────┤
│              Theme-Aware UI Components                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────────┐   │
│  │  Button  │  │   Card   │  │     SurveyJS (applyTheme())       │   │
│  │ (glass   │  │ (backdrop │  │  glass-purple → dark palette     │   │
│  │  glow)   │  │  blur)   │  │  daylight → light palette        │   │
│  └──────────┘  └──────────┘  └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component                   | Responsibility                                                                                            | Communicates With                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `ThemeProvider`             | Owns theme state, reads/writes localStorage, applies `data-theme` attribute to `document.documentElement` | All children via `useTheme()` hook                   |
| `useTheme()` hook           | Exposes `{ theme, setTheme, toggleTheme }` to consumers                                                   | ThemeProvider context                                |
| `AdminLayout`               | AppShell: fixed sidebar (desktop), Sheet drawer (mobile), contains ThemeToggle button                     | ThemeProvider (reads theme for active state display) |
| `StudentLayout`             | Header-only shell with ThemeToggle                                                                        | ThemeProvider                                        |
| `ThemeToggle`               | Sun/Moon button, calls `toggleTheme()`                                                                    | ThemeProvider via `useTheme()`                       |
| `Button` (shadcn/ui)        | Glass glow variant on Glass Purple; standard on Daylight                                                  | CSS variables only (no JS theme awareness needed)    |
| `Card` (shadcn/ui)          | Backdrop blur + semi-transparent on Glass Purple; solid on Daylight                                       | CSS variables only                                   |
| `SurveyJS (TakeAssessment)` | Must call `model.applyTheme()` with correct palette when theme changes                                    | ThemeProvider via `useTheme()`                       |
| `index.css`                 | Owns all CSS variable definitions for both themes                                                         | None — consumed by Tailwind + raw CSS                |
| `tailwind.config.js`        | Maps Tailwind color tokens to CSS variables via `var()`                                                   | `index.css` for runtime values                       |

---

## Recommended Project Structure

```
app/src/
├── lib/
│   ├── theme.ts             # Theme constants: type Theme = 'daylight' | 'glass-purple'
│   └── surveyjs-license.ts  # Existing (unchanged)
├── contexts/
│   └── ThemeContext.tsx     # ThemeProvider + useTheme hook
├── components/
│   ├── ThemeToggle.tsx      # Sun/Moon button, calls toggleTheme()
│   ├── AppShell.tsx         # New: sidebar + header wrapper (replaces AdminLayout body)
│   ├── AdminLayout.tsx      # Updated: uses AppShell + sidebar nav links
│   ├── StudentLayout.tsx    # Updated: uses theme-aware header
│   └── ui/
│       ├── button.tsx       # Updated: glass variant for Glass Purple
│       └── card.tsx         # Updated: backdrop-blur for Glass Purple
└── index.css                # Updated: new CSS variable format + both themes
```

### Structure Rationale

- **`contexts/`**: Keeps ThemeProvider separate from components; the project currently has no `contexts/` folder — creating it signals this is global state infrastructure, not a feature component.
- **`lib/theme.ts`**: Single source of truth for the `Theme` type literal. Prevents typo drift between `ThemeProvider`, `ThemeToggle`, and `SurveyJS` integration.
- **`components/AppShell.tsx`**: Separates layout chrome (sidebar + main content slot) from navigation logic in `AdminLayout`, making sidebar mobile behavior testable in isolation.

---

## Architectural Patterns

### Pattern 1: data-theme Attribute on `document.documentElement`

**What:** ThemeProvider applies `data-theme="daylight"` or `data-theme="glass-purple"` directly to the `<html>` element. CSS selectors `[data-theme="glass-purple"]` override `:root` variables.

**When to use:** Preferred over `.dark` class approach when using named themes (not binary light/dark). Avoids the shadcn/ui `.dark` class convention conflict — we are NOT using shadcn's built-in dark mode because we're migrating away from their HSL variable format.

**Trade-offs:**

- Pro: No need for a `.dark` CSS class; works alongside any future system-preference detection
- Pro: Explicit theme name in DOM — useful for debugging, and avoids conflict with OS dark mode media queries
- Con: SurveyJS receives theme name via `applyTheme()` JS call, not CSS, so SurveyJS must be explicitly synced

**Example:**

```typescript
// contexts/ThemeContext.tsx
const STORAGE_KEY = 'mededprep-theme';
type Theme = 'daylight' | 'glass-purple';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Lazy init: read localStorage once on mount (avoids SSR issues)
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'daylight';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () =>
    setThemeState((t) => (t === 'daylight' ? 'glass-purple' : 'daylight'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

**Placement:** Wrap `App` in `main.tsx`, inside `QueryClientProvider` and `BrowserRouter` but before `App`:

```typescript
// main.tsx
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

---

### Pattern 2: CSS Variable Organization — `:root` + `[data-theme]` Selectors

**What:** All CSS variable definitions live in `index.css`. `:root` defines the Daylight defaults. `[data-theme="glass-purple"]` overrides all variables for the Glass Purple theme.

**When to use:** Always for this project — both themes are positively named, not light/dark binary.

**Trade-offs:**

- Pro: One canonical location for all theme values — no scattered CSS
- Pro: Theme switch is a single DOM attribute change, zero JS re-renders for styling
- Con: `[data-theme]` selector has slightly lower specificity than some element styles; rarely an issue with shadcn/ui's approach

**CSS variable format — CRITICAL MIGRATION DETAIL:**

Current format (HSL components — what is being removed):

```css
:root {
  --primary: 221 76% 46%; /* consumed via hsl(var(--primary)) */
}
```

New format (raw hex — what replaces it):

```css
:root {
  /* Daylight theme (default) */
  --primary: #1b5fd0;
  --primary-foreground: #ffffff;
  --background: #ffffff;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --secondary: #f1f5f9;
  --secondary-foreground: #1e293b;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --accent: #f1f5f9;
  --accent-foreground: #1e293b;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #e2e8f0;
  --input: #e2e8f0;
  --ring: #1b5fd0;
  --radius: 0.5rem;
}

[data-theme='glass-purple'] {
  /* Glass Purple theme overrides */
  --primary: #7c3aed;
  --primary-foreground: #ffffff;
  --background: #0f0a1e; /* deep purple-black */
  --foreground: #e2d9f3;
  --card: rgba(124, 58, 237, 0.08);
  --card-foreground: #e2d9f3;
  --secondary: rgba(124, 58, 237, 0.15);
  --secondary-foreground: #c4b5fd;
  --muted: rgba(255, 255, 255, 0.06);
  --muted-foreground: #a78bfa;
  --accent: rgba(124, 58, 237, 0.2);
  --accent-foreground: #ddd6fe;
  --destructive: #f87171;
  --destructive-foreground: #0f0a1e;
  --border: rgba(124, 58, 237, 0.25);
  --input: rgba(124, 58, 237, 0.15);
  --ring: #7c3aed;
  --radius: 0.5rem;
}
```

**Glass-specific variables** (only exist in `[data-theme="glass-purple"]`):

```css
[data-theme='glass-purple'] {
  --glass-blur: 16px;
  --glass-bg: rgba(124, 58, 237, 0.08);
  --glass-border: rgba(124, 58, 237, 0.25);
  --glass-glow: 0 0 20px rgba(124, 58, 237, 0.3);
  --gradient-bg:
    radial-gradient(ellipse at top, rgba(124, 58, 237, 0.15) 0%, transparent 60%),
    radial-gradient(ellipse at bottom right, rgba(139, 92, 246, 0.1) 0%, transparent 60%);
}
```

**Body-level background treatment** for Glass Purple:

```css
[data-theme='glass-purple'] body {
  background: var(--background);
  background-image: var(--gradient-bg);
  background-attachment: fixed;
}
```

---

### Pattern 3: Tailwind Config — `var()` Without `hsl()` Wrapper

**What:** `tailwind.config.js` maps color tokens directly to CSS variables using `var(--name)`. No `hsl()` wrapper.

**Trade-off of this approach:** Tailwind's opacity modifiers (`bg-primary/50`) will NOT work with raw hex CSS variables in Tailwind v3. Opacity variants require channel-format variables or `color-mix()`. For this project this is an acceptable trade-off because: (a) the Glass Purple theme uses rgba() values directly in the CSS variables themselves, (b) the codebase does not currently use opacity modifier utilities extensively, (c) Tailwind v4 would handle this natively but we are staying on v3.

```javascript
// tailwind.config.js (new format)
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
          // Remove numeric shades (50, 100, 500, 600, 700) — all replaced by semantic tokens
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
          DEFAULT: 'var(--popover, var(--card))',
          foreground: 'var(--popover-foreground, var(--card-foreground))',
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

**Removal of `hsl()` wrapper in `@layer base`:**

```css
/* OLD — remove this */
* {
  border-color: hsl(var(--border));
}

/* NEW */
* {
  border-color: var(--border);
}
```

---

### Pattern 4: Component Theming — CSS-First, JS-Second

**What:** Components consume theme via CSS variables (not JS context) for all visual styling. Only components that need to behave differently (not just look different) consume `useTheme()`.

**Rule:** If the difference between Daylight and Glass Purple is purely visual (color, blur, glow), express it in CSS. Only reach for `useTheme()` when you need different React rendering or conditional props.

**Examples:**

Card — CSS only (no `useTheme()`):

```css
/* index.css additions */
.card-glass {
  background: var(--card);
  backdrop-filter: blur(var(--glass-blur, 0px));
  -webkit-backdrop-filter: blur(var(--glass-blur, 0px));
  border: 1px solid var(--glass-border, var(--border));
  box-shadow: var(--glass-glow, none);
}
```

```tsx
// card.tsx — add glass-aware variant
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl border bg-card text-card-foreground shadow card-glass', className)}
      {...props}
    />
  ),
);
```

When `--glass-blur` and `--glass-glow` are undefined (Daylight theme), `blur(0px)` and `none` are the fallbacks — the card renders normally. When Glass Purple is active, those variables exist and glass effects engage. Zero conditional JS required.

Button — glass glow on primary variant, CSS only:

```css
[data-theme='glass-purple'] .btn-primary {
  box-shadow: 0 0 12px rgba(124, 58, 237, 0.4);
}
[data-theme='glass-purple'] .btn-primary:hover {
  box-shadow: 0 0 20px rgba(124, 58, 237, 0.6);
}
```

SurveyJS — requires `useTheme()` because it uses a JS API:

```tsx
// TakeAssessment.tsx
const { theme } = useTheme();

useEffect(() => {
  if (!surveyModel) return;
  if (theme === 'glass-purple') {
    surveyModel.applyTheme({
      colorPalette: 'dark',
      cssVariables: {
        '--sjs-primary-backcolor': '#7c3aed',
        '--sjs-primary-backcolor-light': 'rgba(124, 58, 237, 0.1)',
        '--sjs-primary-backcolor-dark': '#6d28d9',
        '--sjs-primary-forecolor': '#ffffff',
        '--sjs-general-backcolor': '#0f0a1e',
        '--sjs-general-forecolor': '#e2d9f3',
      },
    });
  } else {
    surveyModel.applyTheme({
      colorPalette: 'light',
      cssVariables: {
        '--sjs-primary-backcolor': '#1b5fd0',
        '--sjs-primary-backcolor-light': 'rgba(27, 95, 208, 0.1)',
        '--sjs-primary-backcolor-dark': '#1550b5',
        '--sjs-primary-forecolor': '#ffffff',
      },
    });
  }
}, [theme, surveyModel]);
```

---

### Pattern 5: Glass Background Effects — Body and Layout Level, Not Card Level

**What:** The gradient background (`radial-gradient` with purple glows) lives on `body` via `[data-theme="glass-purple"] body`. Card blur (`backdrop-filter`) lives on the card component. This layering is what makes glass effects work — backdrop-filter blurs whatever is behind the element, so the body gradient must exist first.

**Component hierarchy for glass effects:**

```
body                          ← gradient background (CSS, data-theme selector)
  └── AppShell / layout div   ← min-h-screen, no extra background
       └── Card               ← backdrop-filter: blur(16px)
            └── content       ← reads --foreground, --muted-foreground, etc.
```

**Critical constraint:** `backdrop-filter` requires the parent to NOT have `transform`, `filter`, or `will-change` properties that would create a new stacking context — doing so clips the blur to the parent bounds. AppShell and main layout containers must avoid these properties.

**What NOT to do:** Do not put the gradient on a full-screen `<div>` wrapper instead of `body`. A wrapper with `position: fixed; inset: 0` as a gradient background creates a stacking context that clips card blurs. Always use `body` or `html` for the root background.

---

## Data Flow

### Theme State Propagation

```
localStorage ('mededprep-theme')
        ↓ (read once on mount — lazy useState initializer)
ThemeProvider (useState<Theme>)
        ↓ (useEffect)
document.documentElement.setAttribute('data-theme', theme)
        ↓ (CSS cascade)
CSS variables switch theme → all var() consumers update immediately
        ↓ (React context)
useTheme() → { theme, toggleTheme }
        ↓
ThemeToggle (renders sun/moon icon)
SurveyJS (calls applyTheme() via useEffect on [theme])
```

### Request Flow (Theme Toggle)

```
User clicks ThemeToggle
    ↓
toggleTheme() — ThemeProvider local state update
    ↓ (React state change — synchronous)
useEffect fires: setAttribute('data-theme', newTheme) + localStorage.setItem()
    ↓ (CSS cascade — zero re-renders for styled components)
All CSS variable consumers update automatically
    ↓ (React context update — only for JS consumers)
ThemeToggle re-renders (icon swap)
SurveyJS useEffect fires → applyTheme() called with new palette
```

### Key Data Flows

1. **Initial page load:** localStorage read in useState lazy initializer → `data-theme` set in useEffect before first paint → no flicker (SPA, not SSR)
2. **Theme toggle:** State update → `data-theme` attribute change → CSS cascade updates all colors/effects → SurveyJS JS API called if a survey is mounted
3. **Semantic color sweep:** `primary-500` → `primary` (Tailwind token), `bg-gray-50` → `bg-background`, `bg-white` → `bg-card`, `border-gray-200` → `border-border`. These changes happen at authoring time and have no runtime data flow.

---

## Build Order

This is the critical sequencing constraint. Steps marked ATOMIC must all ship in the same commit.

### Phase 1: Foundation (ATOMIC — one commit)

Everything in this block must be done simultaneously because each piece depends on the others:

| Step | File                     | Change                                                                                                                                                                        |
| ---- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1a   | `app/src/index.css`      | Replace all HSL-component variables with raw hex. Add `[data-theme="glass-purple"]` block. Add glass-specific custom variables.                                               |
| 1b   | `app/tailwind.config.js` | Replace `hsl(var(--xxx))` with `var(--xxx)`. Remove numeric primary shades (50/100/500/600/700).                                                                              |
| 1c   | All 36 source files      | Replace `primary-500` → `primary`, `primary-100` → `secondary`, `primary-50` → `muted`, `bg-gray-50` → `bg-background`, `bg-white` → `bg-card`, `border-gray-200` → `border`. |
| 1d   | `app/src/index.css`      | Update `* { border-color: hsl(var(--border)) }` → `* { border-color: var(--border) }`                                                                                         |

After this commit: app must render identically to before (Daylight = same visual appearance as current, brand color #1b5fd0 preserved).

### Phase 2: ThemeProvider + Toggle (depends on Phase 1)

| Step | File                                 | Change                                          |
| ---- | ------------------------------------ | ----------------------------------------------- |
| 2a   | `app/src/lib/theme.ts`               | Add `type Theme = 'daylight' \| 'glass-purple'` |
| 2b   | `app/src/contexts/ThemeContext.tsx`  | Implement `ThemeProvider` + `useTheme`          |
| 2c   | `app/src/components/ThemeToggle.tsx` | Sun/Moon button                                 |
| 2d   | `app/src/main.tsx`                   | Wrap App in `<ThemeProvider>`                   |

After this phase: Theme toggle exists and switches `data-theme`. Glass Purple shows basic color changes. No glass effects yet.

### Phase 3: AppShell + Admin Sidebar (depends on Phase 2)

| Step | File                                 | Change                                              |
| ---- | ------------------------------------ | --------------------------------------------------- |
| 3a   | shadcn/ui                            | Add `Sheet`, `Tooltip`, `ScrollArea` components     |
| 3b   | `app/src/components/AppShell.tsx`    | Create sidebar layout with mobile Sheet drawer      |
| 3c   | `app/src/components/AdminLayout.tsx` | Refactor to use AppShell, move nav links to sidebar |

### Phase 4: Glass Effects on Components (depends on Phase 2)

| Step | File                               | Change                                                     |
| ---- | ---------------------------------- | ---------------------------------------------------------- |
| 4a   | `app/src/index.css`                | Add `[data-theme="glass-purple"] body` gradient background |
| 4b   | `app/src/components/ui/card.tsx`   | Add backdrop-filter + glass border                         |
| 4c   | `app/src/components/ui/button.tsx` | Add glass glow on primary variant                          |

### Phase 5: SurveyJS Theme Sync (depends on Phase 2)

| Step | File                                      | Change                                                                     |
| ---- | ----------------------------------------- | -------------------------------------------------------------------------- |
| 5a   | `app/src/pages/public/TakeAssessment.tsx` | Add `useTheme()` + useEffect to call `applyTheme()` based on current theme |

### Phase 6: Semantic Color Sweep (can be done alongside Phase 3-5, or after)

| Step | Scope                          | Change                                                                                                                                                 |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 6a   | All 36 files (101 occurrences) | Replace remaining hardcoded `bg-white`, `bg-gray-*`, `text-gray-*`, amber/amber literal class usages with semantic tokens or inline `var()` references |

---

## Anti-Patterns

### Anti-Pattern 1: Partial HSL Migration

**What people do:** Migrate `index.css` variables to hex but forget to update `tailwind.config.js` (or vice versa).

**Why it's wrong:** After migration, `hsl(var(--primary))` in tailwind.config will receive `#1b5fd0` and try to pass it as HSL channel values — the browser interprets it as `hsl(#1b5fd0)` which is invalid. Every color token in the app breaks simultaneously.

**Do this instead:** The atomic Phase 1 commit approach — `index.css` + `tailwind.config.js` + all class references change in one commit. Use `npm run build` as the gate — if it compiles without error and renders correctly, the migration is complete.

### Anti-Pattern 2: useTheme() in Every Styled Component

**What people do:** Import `useTheme()` in Button, Card, Input, Badge, etc. to conditionally apply classes.

**Why it's wrong:** Every themed component now re-renders on theme toggle, even those with no behavioral difference. With dozens of UI primitives, a theme toggle causes a mass re-render tree. It also tightly couples visual styling to React context.

**Do this instead:** CSS variables + `[data-theme]` selectors handle all purely visual changes. `useTheme()` is reserved for components that need conditional React rendering (SurveyJS, components with different DOM structure per theme).

### Anti-Pattern 3: Glass Effects Without a Gradient Root

**What people do:** Apply `backdrop-filter: blur()` to cards without establishing a colored background behind them.

**Why it's wrong:** `backdrop-filter` blurs whatever is rendered behind the element. If the background is `#0f0a1e` (flat dark), the "glass" effect just shows a blurred version of the same dark color — it looks like a slightly lighter box, not glass.

**Do this instead:** The gradient background on `body` in `[data-theme="glass-purple"] body` creates the layered color gradients that give glass its characteristic translucent-over-color appearance.

### Anti-Pattern 4: Shadcn `.dark` Class Approach for Named Themes

**What people do:** Use shadcn/ui's built-in `.dark` class mechanism and remap it to Glass Purple.

**Why it's wrong:** shadcn `.dark` is a binary light/dark toggle. Using it for a named theme creates ambiguity if a system dark-mode preference is later considered, and it conflicts with any CSS that uses `prefers-color-scheme: dark` media queries. The `[data-theme]` attribute approach is unambiguous.

**Do this instead:** Ignore shadcn's dark mode convention entirely. Use `[data-theme="glass-purple"]` as the sole theme selector. Remove the `darkMode: 'class'` Tailwind config option if it was previously set.

### Anti-Pattern 5: Numeric Primary Shades Retained

**What people do:** Keep `primary-50`, `primary-100`, `primary-500` in tailwind.config after migration "just in case."

**Why it's wrong:** These are hardcoded hex values that don't respond to theme switching. A component using `bg-primary-50` in Glass Purple will render the Daylight light blue, not the Glass Purple muted tone.

**Do this instead:** Remove all numeric shades during the Phase 1 atomic commit. Replace every usage with a semantic token (`primary`, `secondary`, `muted`, `accent`). If a specific shade is needed that has no semantic equivalent, use a raw `style={{ color: 'var(--primary)' }}` with opacity adjustment or define a new semantic variable.

---

## Integration Points

### External Services

| Service          | Integration Pattern                                                       | Notes                                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SurveyJS         | JS `model.applyTheme()` called from `useEffect` triggered by `useTheme()` | Must handle the case where surveyModel is null (model not yet mounted). Place in the same useEffect that initializes the model, or a separate effect with `[theme, surveyModel]` deps. |
| SurveyJS Creator | `survey-creator-core.min.css` imported globally — not theme-aware         | Survey Creator is admin-only; acceptable to leave in its own visual system. Do not attempt to theme it.                                                                                |

### Internal Boundaries

| Boundary                        | Communication                                                                | Notes                                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| ThemeProvider → CSS             | `document.documentElement.setAttribute('data-theme', ...)` — DOM side effect | Must happen in `useEffect`, not render phase                                                                           |
| ThemeProvider → localStorage    | `localStorage.setItem('mededprep-theme', ...)` in same `useEffect`           | Key: `'mededprep-theme'` to avoid collision with Zustand `'auth-storage'` key                                          |
| Tailwind tokens → CSS variables | `var(--primary)` in tailwind.config — resolved at browser paint time         | Tailwind generates static CSS with `var()` references; values resolve at runtime from whichever `data-theme` is active |
| AdminLayout → AppShell          | AdminLayout renders AppShell as its wrapper; AppShell owns sidebar structure | Nav links remain in AdminLayout (knows the routes); AppShell owns the chrome                                           |

---

## Scaling Considerations

This is a UI theme migration, not a scalability problem. Relevant considerations:

| Concern                        | At current scale                                                      | If adding more themes later                                                              |
| ------------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| CSS file size                  | One `:root` block + one `[data-theme]` block — minimal                | Each additional theme is one `[data-theme]` block; scales linearly with number of themes |
| Theme switch performance       | CSS attribute change + one localStorage write — near-instant          | Same; CSS variable switches are browser-native and GPU-friendly                          |
| SurveyJS sync                  | One `applyTheme()` call on toggle — negligible                        | Same pattern, just expand the conditional                                                |
| Component re-renders on toggle | Zero (CSS-only components) + ThemeToggle + any `useTheme()` consumers | Stays bounded if the CSS-first rule is followed                                          |

---

## Sources

- shadcn/ui Theming docs: [https://ui.shadcn.com/docs/theming](https://ui.shadcn.com/docs/theming) — confirmed `:root` + class selectors, CSS variable naming conventions (HIGH confidence)
- SurveyJS Themes docs: [https://surveyjs.io/form-library/documentation/manage-default-themes-and-styles](https://surveyjs.io/form-library/documentation/manage-default-themes-and-styles) — confirmed `applyTheme()` API and `cssVariables` structure (HIGH confidence)
- Tailwind v3 Custom Colors: [https://v3.tailwindcss.com/docs/customizing-colors](https://v3.tailwindcss.com/docs/customizing-colors) — confirmed `var()` support; opacity modifier limitation with raw CSS variables (HIGH confidence)
- Epic React CSS Variables over Context: [https://www.epicreact.dev/css-variables](https://www.epicreact.dev/css-variables) — CSS-first approach pattern (MEDIUM confidence, verified against codebase needs)
- Codebase inspection: `app/src/index.css`, `app/tailwind.config.js`, `app/src/components/AdminLayout.tsx`, `app/src/components/ui/button.tsx`, `app/src/components/ui/card.tsx`, `app/src/pages/public/TakeAssessment.tsx` — all verified directly (HIGH confidence)

---

_Architecture research for: CSS theme system migration + Daylight/Glass Purple dual-theme, mededprep-inst_
_Researched: 2026-02-23_
