# Pitfalls Research

**Domain:** CSS theme migration — HSL to hex, 2-theme system, glassmorphism, SurveyJS dark mode
**Researched:** 2026-02-23
**Confidence:** HIGH (codebase verified, official docs confirmed, multiple sources)

---

## Critical Pitfalls

### Pitfall 1: Partial CSS Variable Migration Breaks Every Component Simultaneously

**What goes wrong:**
The current `index.css` defines variables in HSL-component format (`--primary: 221 76% 46%`) and `tailwind.config.js` wraps them in `hsl()` (`'hsl(var(--primary))'`). These two files are tightly coupled. If you update one without the other — or update the CSS variables without also finding and replacing all `hsl(var(--xxx))` inline usages in component files — every Tailwind semantic color class (`bg-primary`, `text-foreground`, `border-border`) produces `hsl(#1b5fd0)` which is an invalid CSS value and renders transparent or black.

**Why it happens:**
Developers update `index.css` variables to hex first (the "obvious" file), then discover `tailwind.config.js` also contains the `hsl()` wrappers, then discover there are additional `hsl(var(--xxx))` references inline in component files. Each discovery is a separate breakage. In this codebase there are also 34 files with `primary-500/100/50` shade classes that are defined as hardcoded hex in `tailwind.config.js` — these need semantic token replacement in the same pass, not a separate one.

**How to avoid:**
Execute the migration as a single atomic commit touching all four parts together:

1. `index.css` — replace HSL-component values with raw hex values
2. `tailwind.config.js` — replace all `hsl(var(--xxx))` wrappers with `var(--xxx)`
3. The global `border-color: hsl(var(--border))` rule in `index.css` — replace with `var(--border)`
4. All 34 files using `primary-500`, `primary-100`, `primary-50` — replace with semantic tokens in the same commit

Stage all changes together, verify build passes, commit as one unit. Never commit a state where `index.css` has hex values but `tailwind.config.js` still has `hsl()` wrappers.

**Warning signs:**

- Any component renders with no background color or transparent text after touching `index.css`
- Browser DevTools shows computed color as `hsl(#1b5fd0)` or `hsl(oklch(...))` — invalid syntax
- Build passes but all shadcn/ui components look unstyled

**Phase to address:**
Phase 1 (CSS variable migration) — must be the very first phase, completed atomically before any other UI work.

---

### Pitfall 2: The Global `border-color: hsl(var(--border))` Rule Silently Breaks After Format Change

**What goes wrong:**
`index.css` line 37 sets `border-color: hsl(var(--border))` on `*`. When `--border` changes from an HSL-component value to a hex value, this rule becomes `border-color: hsl(#e2e8f0)` — invalid CSS, silently ignored by browsers. Every border on every element (inputs, cards, tables, dividers) loses its color and defaults to `currentColor` or inherits unexpectedly. This is the most invisible breakage because it looks correct at first glance (elements still render) but borders have wrong colors.

**Why it happens:**
The rule is a known shadcn/ui pattern to ensure consistent border rendering. It lives in `@layer base` so it has low specificity and doesn't appear in component code. Developers searching for `--border` references will find the config mapping but miss the inline `hsl()` wrap in the base layer.

**How to avoid:**
When migrating the CSS variable format, simultaneously update this rule to `border-color: var(--border)`. The existing `.sd-root-modern * { border-color: revert; }` block must remain untouched immediately after — it overrides this rule for SurveyJS elements and must survive the migration.

**Warning signs:**

- All form inputs, cards, and table cells have invisible or black borders
- DevTools computed styles show `border-color: rgb(0,0,0)` or computed as `currentColor` for elements that should have light gray borders
- SurveyJS rendering looks correct (because of the `revert` override) but surrounding UI borders are wrong

**Phase to address:**
Phase 1 (CSS variable migration) — must be fixed in the same commit as the variable format change.

---

### Pitfall 3: SurveyJS CSS Bleeds Into App Styles (and Vice Versa)

**What goes wrong:**
`survey-core/survey-core.min.css` is imported globally in `main.tsx`. This stylesheet sets CSS variables on `:root` (in older SurveyJS versions, directly on `body`). When the new theme system also sets variables on `:root` using `.dark` class overrides, there are two competing sources of CSS variables on the root element. SurveyJS variables like `--primary-backcolor` could shadow or be shadowed by app variables if names collide. Conversely, the app's `border-color: hsl(var(--border))` on `*` overrides SurveyJS internal borders, which is why the existing `.sd-root-modern * { border-color: revert; }` block exists — and must be preserved exactly.

**Why it happens:**
SurveyJS 2.x moved CSS variables from `body` to the survey root element (`.sd-root-modern`), but the global CSS import still affects the cascade. When adding a dark mode system that toggles the `dark` class on `<html>`, any SurveyJS variables that are not explicitly overridden inside `.dark .sd-root-modern` will retain their light-mode values regardless of the app theme.

**How to avoid:**

- Never remove or modify the existing `.sd-root-modern * { border-color: revert; }` block in `index.css` — all SurveyJS overrides are additive
- Dark mode SurveyJS overrides must use `.dark .sd-root-modern` scope, not just `.dark`
- Use `model.applyTheme({ colorPalette: 'dark', cssVariables: { ... } })` for programmatic dark-mode theming — this is the SurveyJS-native approach for runtime theme switching
- Test that the existing `model.applyTheme({ cssVariables: { '--sjs-primary-backcolor': '#1b5fd0', ... } })` call in `TakeAssessment.tsx` line 204 continues to work after adding `.dark` class toggling — the `applyTheme` call must be made after the model is created and should receive the correct color palette based on the current theme

**Warning signs:**

- SurveyJS borders reappear with incorrect colors (usually too dark or invisible) after CSS variable migration
- Radio button or checkbox selected states lose the brand blue color in dark mode
- Assessment background turns white in Glass Purple theme despite body being dark

**Phase to address:**
Phase 3 (SurveyJS theme sync) — but the `border-color: revert` preservation must happen in Phase 1 to prevent regression during migration.

---

### Pitfall 4: Theme Flash (FOUC) Because ThemeContext Initializes Inside React

**What goes wrong:**
If the theme is initialized inside a React context or `useEffect`, the page renders for one frame in the default light state before JavaScript reads localStorage and applies the `dark` class to `<html>`. This produces a visible white flash when users with the Glass Purple theme refresh or navigate. The flash is especially jarring with glassmorphism because the background transitions from white to a dark purple gradient.

**Why it happens:**
`useEffect` and React context both run after the browser has already painted. The current `index.html` has no inline script — it's a plain HTML file with just a `<div id="root">` and the module script. Any theme stored in localStorage is invisible to the browser until React mounts, which is too late.

**How to avoid:**
Add a synchronous inline script to `index.html` in the `<head>` before the React module script. This script reads localStorage and sets the `dark` class on `<html>` before the first paint:

```html
<script>
  try {
    var theme = localStorage.getItem('theme');
    if (theme === 'glass-purple') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
</script>
```

The ThemeContext in React then reads from localStorage as initial state (synchronously via `useState(() => localStorage.getItem('theme') ?? 'daylight')`), not via `useEffect`. The React state and the DOM class will be in sync from first paint.

**Warning signs:**

- Returning users with dark theme see a white flash before dark styles apply
- DevTools performance timeline shows a style recalculation immediately after first paint
- Theme toggle works correctly but page refresh always shows light mode briefly

**Phase to address:**
Phase 2 (ThemeContext + toggle) — the inline script in `index.html` must be part of the ThemeContext implementation, not deferred.

---

### Pitfall 5: Glassmorphism Breaks When Applied Without a Background Layer

**What goes wrong:**
`backdrop-filter: blur()` only shows an effect when there is content behind the element to blur. If a glass Card component is placed on a white background (Daylight theme) or an unstyled container, `backdrop-filter` produces no visible effect. In the Glass Purple theme, if the radial gradient background is not rendered at the body/root level before glass components mount, glass cards appear as flat semi-transparent rectangles with no blur effect.

**Why it happens:**
Developers test glass effects on a page with obvious background content (images, gradients) but deploy them over flat white backgrounds where there is nothing to blur. The `backdrop-filter` property is valid CSS with wide browser support (~95% global), but it requires the `background` of the element itself to be semi-transparent (not `background: white`) to show through.

**How to avoid:**

- The Glass Purple theme's background gradient must be set on `<body>` or the root wrapper, not on individual page containers
- Glass Card components must use `background: rgba(255, 255, 255, 0.08)` or similar semi-transparent value — never `bg-white` or `bg-card` (solid) in Glass Purple mode
- Apply `will-change: transform` or `transform: translateZ(0)` to glass elements for GPU layer promotion
- Limit blur to 10-12px; values above 20px are exponentially expensive
- Always include `-webkit-backdrop-filter` alongside `backdrop-filter` for Safari
- Test on mobile — glass effects should reduce blur to 6-8px or disable entirely on touch devices with low GPU capability

**Warning signs:**

- Glass cards look like opaque gray boxes (background is solid, not semi-transparent)
- No blur visible despite `backdrop-filter: blur(10px)` in DevTools computed styles (background layer missing or opaque)
- Performance jank on mid-range devices when scrolling past glass elements

**Phase to address:**
Phase 4 (Glass Purple effects) — glass components must be built after the background gradient infrastructure is in place.

---

### Pitfall 6: Hardcoded Tailwind Color Classes Survive the Migration Sweep

**What goes wrong:**
The codebase has 52 occurrences of hardcoded Tailwind gray/white classes (`bg-white`, `bg-gray-50`, `bg-gray-100`, `text-gray-*`, `border-gray-*`) across 24 files, plus 34 files with `primary-500/100/50` shade classes. A regex find-and-replace of common patterns will miss edge cases: classes in template literals, classes inside conditional expressions, classes generated by `cn()` with dynamic segments, and classes in test files. Any remaining hardcoded colors become visible bugs in Glass Purple theme as white boxes on dark backgrounds.

**Why it happens:**
Bulk replacement is done with a text editor search, which catches obvious patterns but misses compound expressions. Conditional Tailwind classes like `condition ? 'bg-white' : 'bg-gray-100'` require both sides to be replaced. The `cn()` utility (from `clsx`/`tailwind-merge`) is used throughout shadcn/ui components, making class strings harder to grep predictably.

**How to avoid:**
Run a targeted grep after any bulk replacement to verify no hardcoded color utilities remain in non-test source files:

```bash
grep -rn "bg-white\|bg-gray-\|text-gray-\|border-gray-\|primary-50\b\|primary-100\b\|primary-500\b" app/src --include="*.tsx" --include="*.ts" | grep -v "__tests__"
```

This must return zero results before marking the color sweep phase complete. Test files can keep hardcoded classes since they test rendered output, not theme behavior.

**Warning signs:**

- Any white or light-gray element visible in Glass Purple theme that is not explicitly a Daylight-only component
- `bg-white` appearing in DevTools computed styles for elements that should be glass or dark
- Public pages (TakeAssessment, AttendSession, CreateAccount) look correct in Daylight but wrong in Glass Purple — these pages have the highest density of hardcoded colors (AttendSession and CheckOutSession have 8 gray/white references each)

**Phase to address:**
Phase 5 (aggressive color sweep) — after ThemeContext is working, so dark mode can be visually verified against each fixed file.

---

### Pitfall 7: SurveyJS `applyTheme()` Must Be Called with Theme-Aware Colors, Not Hardcoded Hex

**What goes wrong:**
`TakeAssessment.tsx` currently calls `model.applyTheme()` with hardcoded brand hex values (line 204-211). When the Glass Purple theme is active, this still applies the Daylight primary color (`#1b5fd0`) to SurveyJS elements, ignoring the dark palette. The SurveyJS survey will render with Daylight blue on a dark purple background — visually inconsistent and potentially unreadable.

**Why it happens:**
The `applyTheme` call is made at survey start time with static values, without any awareness of the current app theme. It is also called only once (on model creation) so subsequent theme toggles while a survey is open will not update SurveyJS colors.

**How to avoid:**
The `applyTheme` call must read the current theme from context or a shared utility and pass the appropriate `colorPalette` and CSS variable set:

```typescript
const isDark = currentTheme === 'glass-purple';
model.applyTheme({
  colorPalette: isDark ? 'dark' : 'light',
  cssVariables: isDark ? darkSurveyVars : lightSurveyVars,
});
```

Define `lightSurveyVars` and `darkSurveyVars` as constants in a shared theme file, not inline. If the theme can change while a survey is in progress, the model must be re-themed on theme change (via a `useEffect` that watches the theme and calls `surveyModel.applyTheme()` if `surveyModel` is non-null).

**Warning signs:**

- SurveyJS selected radio buttons show bright blue on dark purple background
- Survey submit button is Daylight blue in Glass Purple theme
- Survey background is white while the surrounding page is dark

**Phase to address:**
Phase 3 (SurveyJS theme sync) — the `applyTheme` call pattern must be made theme-aware before any user-visible SurveyJS testing.

---

## Technical Debt Patterns

| Shortcut                                                            | Immediate Benefit                     | Long-term Cost                                                                                        | When Acceptable                                           |
| ------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Keep HSL in CSS variables, only update Tailwind config              | Faster migration, fewer files touched | Any future theme addition requires maintaining HSL format alongside hex — confusing for contributors  | Never — the whole point of migrating is to use raw values |
| Skip dark mode for SurveyJS, wrap in `pointer-events: none` overlay | Avoid SurveyJS CSS complexity         | Assessments are the core feature; dark assessment on light background looks broken                    | Never                                                     |
| Use `!important` to force dark styles on SurveyJS elements          | Fixes visible bugs quickly            | Makes future SurveyJS version upgrades impossible to debug; CSS specificity wars                      | Never                                                     |
| Apply glass effects via inline styles computed in React             | Allows per-element blur amounts       | Breaks Tailwind JIT purging, defeats CSS variable system, not tree-shakeable                          | Never — use Tailwind classes with CSS variables           |
| Defer SurveyJS dark mode until after launch                         | Reduces Phase 3 scope                 | Assessments are used by students on every visit; broken dark mode on the core feature is unacceptable | Never                                                     |
| `!important` or `darkMode: 'media'` instead of `darkMode: 'class'`  | No ThemeContext needed                | `media` query cannot be controlled by the UI toggle; breaks the explicit 2-theme intent               | Never                                                     |

---

## Integration Gotchas

| Integration                      | Common Mistake                                                                            | Correct Approach                                                                                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SurveyJS + dark class toggle     | Adding `.dark .sd-root-modern` overrides that conflict with `applyTheme()` CSS variables  | Use `applyTheme({ colorPalette: 'dark' })` as the primary mechanism; CSS overrides only for properties not exposed as SurveyJS variables                                        |
| SurveyJS + global CSS import     | Removing or reordering `import 'survey-core/survey-core.min.css'` relative to `index.css` | Keep the import order: `survey-core.min.css` first, then `index.css` — the `.sd-root-modern * { border-color: revert; }` block in `index.css` depends on loading after SurveyJS |
| Tailwind + CSS custom properties | Using `hsl(var(--color))` inside Tailwind's `theme.extend.colors` after migration         | After migrating variables to raw hex, use `var(--color)` directly — Tailwind wraps in `hsl()` automatically when the channel format is detected                                 |
| ThemeContext + localStorage      | Reading localStorage inside `useEffect` for initial state                                 | Read localStorage synchronously in `useState` initializer: `useState(() => localStorage.getItem('theme') ?? 'daylight')` — avoids one extra render cycle                        |
| ThemeContext + `<html>` class    | Toggling class on `document.body` instead of `document.documentElement`                   | Tailwind's `darkMode: 'class'` checks `<html>` (documentElement), not `<body>`                                                                                                  |
| Glass Purple + radial gradient   | Placing gradient on inner layout wrapper, not `<body>`                                    | Gradient must be on `<body>` or `:root` so it extends full viewport and is visible behind `backdrop-filter` glass elements                                                      |

---

## Performance Traps

| Trap                                         | Symptoms                                                  | Prevention                                                                                                                     | When It Breaks                                            |
| -------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `backdrop-filter: blur()` on many elements   | Scrolling jank, dropped frames on mobile                  | Max 2-3 blur elements visible at once; reduce blur on mobile with responsive classes                                           | ~4+ blurred elements in viewport on mid-range mobile      |
| Animating elements with `backdrop-filter`    | Severe GPU load during hover/transition                   | Do not animate `backdrop-filter` itself; animate `opacity` or `transform` instead                                              | Any device during the animation                           |
| High blur values (`blur-[30px]` or more)     | Exponential GPU cost                                      | Keep blur between 8-12px (`blur-[10px]`)                                                                                       | Values above ~20px on non-Apple GPU                       |
| Glass effect on `overflow: scroll` container | Blur clips to container boundary, looks wrong             | Apply glass only to fixed-position or non-scrolling elements                                                                   | First time a user scrolls within a glass-styled container |
| CSS custom property cascade in SurveyJS      | SurveyJS CSS variables inherit to non-survey DOM elements | SurveyJS 2.x scopes variables to `.sd-root-modern` — verify version behavior, do not rely on older `body`-scoped variable docs | If SurveyJS is downgraded or version differs from 2.5.10  |

---

## Security Mistakes

_(This migration is visual-only and introduces no new security surface. Backend is unmodified. No security pitfalls specific to CSS theming apply.)_

---

## UX Pitfalls

| Pitfall                                                        | User Impact                                                                                 | Better Approach                                                                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Theme preference resets on page refresh                        | Users must toggle on every visit; defeats the purpose of persistence                        | Inline script in `index.html` reads localStorage before first paint — prevents reset and flash                                    |
| No system preference fallback                                  | Users who prefer `prefers-color-scheme: dark` must manually toggle                          | ThemeContext initializer checks `window.matchMedia('(prefers-color-scheme: dark)')` as fallback when no localStorage value exists |
| Theme toggle not visible in student header                     | Students taking assessments have no way to switch themes                                    | Student header layout must include the same sun/moon toggle as admin sidebar                                                      |
| Assessment render flashes unstyled before SurveyJS CSS applies | Students see raw browser input elements briefly                                             | `survey-core/survey-core.min.css` is already imported globally in `main.tsx` — do not move it to lazy-loaded chunks               |
| Glass effects inaccessible without background                  | Users on high-contrast mode or with `prefers-reduced-transparency` see broken glassmorphism | Use `@supports (backdrop-filter: blur(1px))` and add `@media (prefers-reduced-transparency: reduce)` fallbacks                    |

---

## "Looks Done But Isn't" Checklist

- [ ] **CSS variable migration:** Verify `border-color: var(--border)` (not `hsl(var(--border))`) in `index.css` after migration — the most easily missed single-line change
- [ ] **Tailwind config:** Verify all 8 semantic color entries in `tailwind.config.js` use `var(--xxx)` not `hsl(var(--xxx))` — all must change together
- [ ] **FOUC prevention:** Verify inline theme script exists in `app/index.html` `<head>` — the file currently has no inline scripts and will flash without this
- [ ] **SurveyJS dark mode:** Verify `model.applyTheme()` in `TakeAssessment.tsx` passes `colorPalette: 'dark'` when Glass Purple is active — the call currently uses only hardcoded light colors
- [ ] **Hardcoded color sweep:** Verify zero remaining `bg-white`, `bg-gray-*`, `text-gray-*` in non-test source files via grep — 52 occurrences across 24 files at baseline
- [ ] **SurveyJS border override preserved:** Verify `.sd-root-modern * { border-color: revert; }` block is still present after `index.css` migration — removing it causes SurveyJS internal borders to inherit the app's border color
- [ ] **Glass background layer:** Verify Glass Purple background gradient is on `<body>` or `:root`, not on a React component wrapper — verify in DevTools with a glass card overlaid on it
- [ ] **localStorage error handling:** Verify `localStorage.getItem` calls are wrapped in `try/catch` — private browsing mode can throw `SecurityError` on localStorage access
- [ ] **Theme class on `<html>`:** Verify `document.documentElement.classList` is used, not `document.body.classList` — Tailwind v3 `darkMode: 'class'` targets `<html>` element
- [ ] **AssessmentCreate page (admin):** Verify SurveyJS Creator (if used) also receives dark theme — the admin assessment creation page uses SurveyJS and is a different `Model` instance from the public TakeAssessment flow

---

## Recovery Strategies

| Pitfall                                               | Recovery Cost | Recovery Steps                                                                                                                                                   |
| ----------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partial CSS variable migration deployed to production | HIGH          | Revert to last known-good commit; do not attempt partial fix; redo migration atomically in a single branch                                                       |
| SurveyJS dark override breaks assessment rendering    | MEDIUM        | Revert SurveyJS-specific CSS changes; restore `.sd-root-modern * { border-color: revert; }` from git history; rebuild SurveyJS overrides in isolation            |
| FOUC visible after ThemeContext PR                    | LOW           | Add inline script to `index.html` and redeploy — script is 5 lines, no other changes needed                                                                      |
| Glass effects cause scroll jank on mobile             | LOW           | Remove `backdrop-filter` from the offending element via responsive class (`sm:backdrop-blur-none` or equivalent); add `will-change: transform`                   |
| Hardcoded color found post-sweep                      | LOW           | One-line fix per file; can be addressed in followup PR without blocking other work                                                                               |
| SurveyJS `applyTheme()` not connected to theme state  | MEDIUM        | Connect theme state to `applyTheme` call; if survey is stateful, re-apply on each model creation; if toggle while in-progress is needed, add `useEffect` watcher |

---

## Pitfall-to-Phase Mapping

| Pitfall                                          | Prevention Phase                                  | Verification                                                                                                |
| ------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Partial CSS variable migration                   | Phase 1: CSS Migration                            | Run `npm run build && npm run typecheck`; visually verify all 8 semantic colors render correctly in browser |
| `border-color: hsl(var(--border))` breakage      | Phase 1: CSS Migration                            | Inspect all form inputs, tables, and card borders in DevTools computed styles                               |
| SurveyJS CSS bleed / border override removal     | Phase 1 (preservation) + Phase 3 (dark overrides) | Take a test assessment in both themes; verify borders, checkboxes, and submit button colors                 |
| Theme flash (FOUC)                               | Phase 2: ThemeContext + Toggle                    | Manually toggle to Glass Purple, hard-refresh; verify no white flash before dark styles apply               |
| Glassmorphism without background layer           | Phase 4: Glass Purple effects                     | View a glass card in DevTools; verify `backdrop-filter` is in computed styles and blur effect is visible    |
| Hardcoded color classes surviving sweep          | Phase 5: Aggressive color sweep                   | Run grep command above; must return zero results before phase sign-off                                      |
| `applyTheme()` not theme-aware                   | Phase 3: SurveyJS theme sync                      | Take an assessment in Glass Purple; verify survey background, buttons, and selected states are dark-themed  |
| `applyTheme()` missing on admin AssessmentCreate | Phase 3: SurveyJS theme sync                      | Open assessment creation page in Glass Purple; verify SurveyJS Creator UI is dark                           |

---

## Sources

- Codebase analysis: `/home/jeramey/projects/mededprep-ecosystem/mededprep-inst/app/src/index.css`, `tailwind.config.js`, `main.tsx`, `index.html`, `TakeAssessment.tsx` — HIGH confidence (direct observation)
- SurveyJS CSS scope issue (variables applied to body vs container): [GitHub Issue #5717](https://github.com/surveyjs/survey-library/issues/5717) — HIGH confidence (official repo)
- SurveyJS theme documentation — [applyTheme, colorPalette, cssVariables](https://surveyjs.io/form-library/documentation/manage-default-themes-and-styles) — HIGH confidence (official docs)
- Tailwind dark mode class strategy: [Tailwind CSS Dark Mode docs](https://tailwindcss.com/docs/dark-mode) — HIGH confidence (official docs)
- FOUC prevention with inline script: [Fixing React Dark Mode Flickering](https://notanumber.in/blog/fixing-react-dark-mode-flickering) — MEDIUM confidence (community, matches official Tailwind guidance)
- Glassmorphism performance pitfalls: [Glassmorphism Implementation Guide 2025](https://playground.halfaccessible.com/blog/glassmorphism-design-trend-implementation-guide) — MEDIUM confidence (community, cross-referenced with MDN backdrop-filter)
- shadcn/ui variable format migration: [shadcn/ui Theming docs](https://ui.shadcn.com/docs/theming), [Tailwind v4 migration guide](https://ui.shadcn.com/docs/tailwind-v4) — HIGH confidence (official docs)
- HSL→hex format coupling in Tailwind: [GitHub Issue #3834](https://github.com/tailwindlabs/tailwindcss/issues/3834) — MEDIUM confidence (official repo issue, older but describes the same coupling)

---

_Pitfalls research for: CSS theme migration — mededprep-inst_
_Researched: 2026-02-23_
