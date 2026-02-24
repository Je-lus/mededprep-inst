# Phase 4: Glass Purple Visual Effects - Research

**Researched:** 2026-02-24
**Domain:** CSS glass morphism, Tailwind utility composition, shadcn/ui component installation, CSS transitions
**Confidence:** HIGH

## Summary

Phase 4 applies the visual polish that makes Glass Purple feel premium: frosted glass cards (backdrop-filter blur), a purple glow on primary button hover (box-shadow), smooth color transitions on theme switch (CSS transition on body), and six new shadcn/ui components. All six components install via a single `npx shadcn@latest add` invocation against the already-configured `components.json`. The glass and glow effects are pure CSS driven by the `[data-theme="glass"]` selector already established in Phase 1, requiring no React changes to Card or Button — only additions to `index.css` and small className extensions in the component files.

The most important constraint discovered in this research: **the build has pre-existing TypeScript errors** in `TakeAssessment.test.tsx` (missing `@testing-library/react` types and `toBeInTheDocument` on Assertion). These errors exist before Phase 4 begins. The success criterion "npm run build and npm run typecheck pass" means the executor must not introduce new errors, and may need to fix or scope-exclude the existing test errors as part of delivering a clean build gate.

**Primary recommendation:** Add glass and glow as pure CSS rules under `[data-theme="glass"]` in `index.css`; install all six shadcn components in one command; fix or exclude the pre-existing test TS errors to establish a clean build baseline.

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                                                    | Research Support                                                                                                                                                                                                   |
| ------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CMP-01 | Button component uses semantic color tokens; primary variant works in both themes                              | Button already uses `bg-primary text-primary-foreground hover:bg-primary/90` semantic tokens — no token changes needed, only add a `[data-theme="glass"] .glass-button-primary:hover` box-shadow rule in index.css |
| CMP-02 | Card component uses semantic color tokens; renders correctly in both themes                                    | Card already uses `bg-card text-card-foreground` semantic tokens — no token changes needed, only add `[data-theme="glass"] .glass-card` backdrop-blur + rgba surface rule in index.css                             |
| CMP-03 | New shadcn/ui components installed: Sheet, Tooltip, ScrollArea, Popover, Checkbox, Switch                      | All six installable via `npx shadcn@latest add sheet tooltip scroll-area popover checkbox switch` from within `app/` directory                                                                                     |
| CMP-04 | Glass card: backdrop-filter blur(12px) + rgba surface + subtle border in Glass Purple; solid white in Daylight | `backdrop-blur-md` in Tailwind v3 = exactly `blur(12px)`; paired with semi-transparent bg via CSS custom property or `bg-card` override under `[data-theme="glass"]`                                               |
| CMP-05 | Primary button glow on hover in Glass Purple: purple box-shadow                                                | CSS box-shadow on `.default` variant button under `[data-theme="glass"]` — no JS, no CVA change needed                                                                                                             |
| CMP-06 | Smooth color transition ~0.25s on theme switch with no jarring flash on background, sidebar, or cards          | Apply `transition: background-color 0.25s ease, color 0.15s ease, border-color 0.25s ease` to `*, body` in index.css; keep under `@layer base`                                                                     |

</phase_requirements>

## Standard Stack

### Core

| Library                  | Version             | Purpose                                                                       | Why Standard                                                       |
| ------------------------ | ------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Tailwind CSS             | v3.4.17 (installed) | Utility classes for backdrop-blur, box-shadow, transition                     | Already in project; `backdrop-blur-md` = 12px                      |
| shadcn/ui CLI            | 3.8.5 (confirmed)   | Scaffolds component files into `src/components/ui/`                           | Already configured via `components.json`; one command adds all six |
| @radix-ui/react-\*       | Various             | Headless primitives for Sheet, Tooltip, ScrollArea, Popover, Checkbox, Switch | shadcn CLI installs peer deps automatically via npm                |
| class-variance-authority | ^0.7.1 (installed)  | CVA for typed component variants                                              | Already used by Button, Badge                                      |

### Supporting

| Library             | Version            | Purpose                                                     | When to Use                                                      |
| ------------------- | ------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| tailwindcss-animate | ^1.0.7 (installed) | CSS animation utilities (data-[state=open]:animate-in etc.) | Sheet, Tooltip, Popover all rely on it for open/close animations |
| tailwind-merge      | ^3.3.0 (installed) | Merge Tailwind classes without conflicts in `cn()`          | Already used; no changes needed                                  |

### Alternatives Considered

| Instead of                                           | Could Use                                                | Tradeoff                                                                                                                |
| ---------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Pure CSS `[data-theme="glass"]` rules for glass/glow | CVA variant `glass` on Button/Card                       | CVA approach couples component logic to theme; CSS-only is cleaner and matches Phase 1/2/3 pattern                      |
| CSS transition on `*` universal selector             | Transition only on body/sidebar                          | Universal selector is simplest and catches all surfaces; slightly higher style recalc cost but negligible at this scale |
| `backdrop-blur-md` Tailwind utility class on Card    | Arbitrary CSS `backdrop-filter: blur(12px)` in index.css | CSS-only approach in index.css keeps component files free of theme-conditional classNames                               |

**Installation:**

```bash
cd app
npx shadcn@latest add sheet tooltip scroll-area popover checkbox switch
```

The CLI reads `components.json` at `app/components.json` automatically when run from `app/`.

## Architecture Patterns

### Recommended Project Structure

No new files needed for glass/glow — all CSS additions go to `app/src/index.css`. The six new components land in `app/src/components/ui/`:

```
app/src/
├── index.css                    # Glass + glow + transition rules added here
├── components/ui/
│   ├── sheet.tsx                # NEW via shadcn CLI
│   ├── tooltip.tsx              # NEW via shadcn CLI
│   ├── scroll-area.tsx          # NEW via shadcn CLI
│   ├── popover.tsx              # NEW via shadcn CLI
│   ├── checkbox.tsx             # NEW via shadcn CLI
│   └── switch.tsx               # NEW via shadcn CLI
```

### Pattern 1: Glass Card via CSS Selector (No Component Changes)

**What:** Under `[data-theme="glass"]`, override the Card's effective background using a CSS rule targeting `bg-card` consumers, rather than editing `card.tsx`.
**When to use:** When a component already uses semantic tokens (`bg-card`) and you want glass effects without touching component files.

```css
/* Source: CSS cascade + [data-theme] selector established in Phase 1 */
[data-theme='glass'] .rounded-xl.border.bg-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px); /* Safari */
  border-color: rgba(255, 255, 255, 0.12);
}
```

**Alternative approach** — CSS custom property override for `--card` under `[data-theme="glass"]`. This is cleaner if Phase 1 set `--card` as a raw hex. Under `[data-theme="glass"]`, set `--card` to an rgba value. However, rgba values cannot be used directly as hex CSS custom properties — they need the `rgb()` / `rgba()` notation in the variable value. This approach works if `bg-card` is consumed via `var(--card)` directly (as hex after Phase 1 migration).

**Recommended approach:** Use the selector approach targeting `.rounded-xl.border.bg-card` OR add a dedicated `.glass-card` utility class in `index.css` and add it to `card.tsx` — one minor className change. The latter is cleaner and more explicit.

```css
/* In index.css — add glass-card utility */
@layer utilities {
  .glass-card {
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
}

/* Then conditionally applied in card.tsx via cn() */
```

Or, cleanest with no component changes:

```css
/* In index.css @layer base */
[data-theme='glass'] .bg-card {
  background: rgba(255, 255, 255, 0.06) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

### Pattern 2: Primary Button Glow via CSS Selector

**What:** Under `[data-theme="glass"]`, add a purple box-shadow on hover to all `.bg-primary` elements that are buttons.
**When to use:** Theme-conditional hover effect with no CVA or component changes needed.

```css
/* Source: CSS pattern, no external library */
[data-theme='glass'] button.bg-primary:hover,
[data-theme='glass'] [role='button'].bg-primary:hover {
  box-shadow: 0 0 20px 4px rgba(139, 92, 246, 0.5);
  transition: box-shadow 0.2s ease;
}
```

The glow color `rgba(139, 92, 246, 0.5)` maps to purple-500 (#8b5cf6) at 50% opacity, which is a standard purple glow. Adjust opacity and spread to match the desired Glass Purple --primary color defined in Phase 1.

### Pattern 3: Smooth Theme Transition

**What:** Add `transition` properties to `*` and `body` in `@layer base` so all color-token-driven values animate when `data-theme` toggles.
**When to use:** Any theme switch via attribute or class toggle; CSS variable-driven color changes animate automatically when the element has transition on the relevant property.

```css
/* Source: Verified pattern from MDN + dev.to/cataon */
@layer base {
  *,
  *::before,
  *::after {
    transition-property: color, background-color, border-color, box-shadow;
    transition-duration: 0.25s;
    transition-timing-function: ease;
  }
}
```

**Critical caveat:** This applies transitions to ALL elements. The `transition-duration: 0.15s` for `color` mentioned in the requirements (color 0.15s, background 0.25s) can be achieved by separating the shorthand:

```css
*,
*::before,
*::after {
  transition:
    background-color 0.25s ease,
    color 0.15s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}
```

**Pitfall:** Transitions on `*` will also fire on initial page load elements. This is acceptable and expected; the FOUC prevention script from Phase 3 (setting `data-theme` before React mounts) ensures there is no visible transition on load.

### Pattern 4: shadcn Component Installation

**What:** All six components install via a single CLI command with the `-y` flag to skip confirmation.
**When to use:** Adding new shadcn/ui components to an existing project with `components.json` already configured.

```bash
# Run from app/ directory (where components.json lives)
npx shadcn@latest add sheet tooltip scroll-area popover checkbox switch --yes
```

This command:

1. Reads `components.json` to determine output paths and style (`new-york`)
2. Installs required Radix UI peer packages via npm automatically
3. Writes component files to `src/components/ui/`
4. Detects `--overwrite` is false (default), preserving existing components

**Radix packages installed by CLI:**

- Sheet → uses `@radix-ui/react-dialog` (already installed — Sheet extends Dialog)
- Tooltip → installs `@radix-ui/react-tooltip`
- ScrollArea → installs `@radix-ui/react-scroll-area`
- Popover → installs `@radix-ui/react-popover`
- Checkbox → installs `@radix-ui/react-checkbox`
- Switch → installs `@radix-ui/react-switch`

### Anti-Patterns to Avoid

- **Adding `data-theme` checks in React component classNames:** Creating `const { theme } = useTheme(); className={theme === 'glass' ? 'backdrop-blur-md ...' : ''}` in card.tsx pollutes component logic. Use CSS `[data-theme="glass"]` selectors in index.css instead.
- **Animating `backdrop-filter` on transition:** The REQUIREMENTS.md explicitly calls this out as out of scope (performance trap). Only animate `background-color`, `color`, `border-color`, `box-shadow` — NOT `backdrop-filter`.
- **Forgetting `-webkit-backdrop-filter`:** Safari requires the prefixed property. Always include both.
- **Using Tailwind opacity modifier on hex CSS variables:** `bg-card/50` syntax does NOT work when `--card` is a raw hex (noted in STATE.md as a known concern from Phase 1). Use `rgba()` in CSS directly or set the `--card` variable to an `rgba()` value under `[data-theme="glass"]`.

## Don't Hand-Roll

| Problem                       | Don't Build                      | Use Instead                                        | Why                                                                             |
| ----------------------------- | -------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| Sheet (mobile sidebar drawer) | Custom drawer component          | `shadcn add sheet`                                 | Already needed by Phase 3 LAY-03; Sheet wraps Radix Dialog with slide animation |
| Tooltip                       | Custom hover tooltip             | `shadcn add tooltip`                               | Focus/keyboard handling, ARIA roles, positioning (Radix Popper) — non-trivial   |
| ScrollArea                    | Styled `overflow-y: auto`        | `shadcn add scroll-area`                           | Cross-browser scrollbar styling, native scroll passthrough, accessibility       |
| Popover                       | Custom absolutely-positioned div | `shadcn add popover`                               | Floating positioning, collision avoidance, portal rendering — Radix Popper      |
| Checkbox                      | `<input type="checkbox">`        | `shadcn add checkbox`                              | Indeterminate state, keyboard nav, ARIA checked state                           |
| Switch                        | `<input type="checkbox">`        | `shadcn add switch`                                | Toggle semantics, Radix thumb animation, focus ring                             |
| Glow on button                | Custom React context check       | CSS `[data-theme="glass"] button:hover` box-shadow | No JS overhead, works on all buttons automatically                              |

**Key insight:** All six components exist precisely to avoid reimplementing cross-browser accessibility and positioning complexity that shadcn/Radix already solves.

## Common Pitfalls

### Pitfall 1: backdrop-filter Requires a Background Color to Be Visible

**What goes wrong:** Adding `backdrop-filter: blur(12px)` with no semi-transparent background renders as if nothing changed — the blur has no "glass" to look through.
**Why it happens:** `backdrop-filter` blurs the content _behind_ the element; if the element has an opaque background, the blur is hidden behind it.
**How to avoid:** Always pair `backdrop-filter: blur()` with a semi-transparent `background: rgba(...)`. Under `[data-theme="glass"]`, set `--card` or use rgba directly.
**Warning signs:** Card looks identical in Glass Purple to Daylight after CSS addition.

### Pitfall 2: Stacking Context Breaks backdrop-filter

**What goes wrong:** A parent element with `transform`, `filter`, `will-change: transform`, or `isolation: isolate` creates a new stacking context that clips `backdrop-filter` to only elements within the same context.
**Why it happens:** The CSS spec requires backdrop-filter elements to have their own stacking context, but parent stacking contexts can limit which "back" pixels are considered.
**How to avoid:** Avoid adding `transform` or `will-change` to Card wrapper elements. The existing shadcn Card is a plain `div` with no transforms — this should be safe by default.
**Warning signs:** Glass blur only shows partial effect or renders as if the blurred layer is a solid color.

### Pitfall 3: Universal Transition (`* { transition: ... }`) Fires on Mount

**What goes wrong:** On initial page load, animated elements flash briefly as they transition from an unpainted state to their final values.
**Why it happens:** `transition` fires whenever a property changes, including the initial paint. With FOUC-prevention from Phase 3, `data-theme` is set before React mounts — so there is no theme-switch transition on load. But other state changes (loading spinners, toast entries) will now have transition applied.
**How to avoid:** The FOUC prevention script from Phase 3 is the guard. Verify it runs before React mounts. If initial paint jitter is observed, scope the transition to `body` and sidebar/card selectors specifically rather than `*`.
**Warning signs:** Page elements visibly "fade in" on hard reload.

### Pitfall 4: Tailwind bg-card/opacity Modifier Fails with Hex Variables

**What goes wrong:** Writing `bg-card/50` in Tailwind expects `--card` to be an HSL channel value (e.g., `0 0% 100%`). After Phase 1 migrates to raw hex, `bg-card/50` generates `background: hsl(var(--card) / 0.5)` which breaks.
**Why it happens:** Tailwind v3's opacity modifier wraps the CSS variable in `hsl()`. Raw hex is not valid inside `hsl()`.
**How to avoid:** Do NOT use opacity modifiers on `bg-card` in Phase 4. Use explicit `rgba()` in CSS directly or set `--card` under `[data-theme="glass"]` to an rgba value (e.g., `rgba(255, 255, 255, 0.06)`).
**Warning signs:** Card background becomes `hsl(#xxxxxx / 0.5)` which is invalid CSS and renders as transparent/broken.

### Pitfall 5: Glass Purple blur Performance on Mid-Range Android

**What goes wrong:** `backdrop-filter: blur(12px)` on multiple Card elements causes jank on slower devices.
**Why it happens:** The GPU must composite each blurred layer separately; multiple simultaneous blur layers multiply the compositing cost.
**How to avoid:** Validate manually during phase. If jank occurs, reduce to `blur(8px)` or disable blur for `@media (pointer: coarse)`. This is noted in STATE.md as a known concern.
**Warning signs:** Low FPS when scrolling a page with many cards in Glass Purple on Android or lower-powered devices.

### Pitfall 6: Pre-Existing TypeScript Build Errors

**What goes wrong:** `npm run build` and `npm run typecheck` already fail before Phase 4 touches any files (confirmed: `TakeAssessment.test.tsx` has 10+ `toBeInTheDocument` TS errors + missing `@testing-library/react` module).
**Why it happens:** The build script (`tsc --noEmit && vite build`) includes test files in TypeScript compilation. These errors are pre-existing but block the Phase 4 success criterion.
**How to avoid:** Before implementing Phase 4 content, fix the baseline TypeScript errors. Options: (a) install `@testing-library/react` dev deps, (b) add a `tsconfig.app.json` that excludes `__tests__/`, or (c) exclude test files in existing `tsconfig.json`. This must be addressed to deliver a passing build gate.
**Warning signs:** `npm run typecheck` fails even with no Phase 4 changes applied.

## Code Examples

Verified patterns from official sources and codebase inspection:

### Glass Card CSS (data-theme conditional)

```css
/* In app/src/index.css, @layer base or @layer utilities */
/* Source: CSS cascade, verified pattern */

[data-theme='glass'] .bg-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-color: rgba(255, 255, 255, 0.12);
}
```

Or, if Card className is extended with a `glass-card` token:

```css
@layer utilities {
  [data-theme='glass'] .glass-card {
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-color: rgba(255, 255, 255, 0.12);
  }
}
```

```tsx
// In card.tsx — add glass-card to className
<div
  ref={ref}
  className={cn(
    'rounded-xl border bg-card text-card-foreground shadow',
    '[data-theme="glass"]_&:backdrop-blur-md',  // NOT recommended — use CSS instead
    className,
  )}
```

The pure CSS approach in index.css is strongly preferred over adding Tailwind class logic in the component.

### Primary Button Glow CSS

```css
/* In app/src/index.css */
/* Source: CSS box-shadow pattern, verified */

[data-theme='glass'] button.bg-primary:hover {
  box-shadow:
    0 0 0 1px rgba(139, 92, 246, 0.3),
    0 0 20px 4px rgba(139, 92, 246, 0.4);
}
```

Adjust the color to match the `--primary` value in Glass Purple. If `--primary` is `#7c3aed` (violet-700 range), use:

```css
[data-theme='glass'] button.bg-primary:hover {
  box-shadow: 0 0 16px 4px rgba(124, 58, 237, 0.5);
}
```

### Smooth Theme Transition CSS

```css
/* In app/src/index.css, @layer base */
/* Source: MDN CSS transitions + dev.to/cataon pattern */

@layer base {
  *,
  *::before,
  *::after {
    transition:
      background-color 0.25s ease,
      color 0.15s ease,
      border-color 0.25s ease,
      box-shadow 0.25s ease;
  }
}
```

### shadcn Component Install Command

```bash
# Source: Official shadcn/ui CLI docs (ui.shadcn.com/docs/cli), version 3.8.5 confirmed
cd /path/to/project/app
npx shadcn@latest add sheet tooltip scroll-area popover checkbox switch --yes
```

### Verifying Installed Component Imports

```typescript
// After install, these imports should resolve:
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
```

## State of the Art

| Old Approach                              | Current Approach                            | When Changed                                     | Impact                                                                                                                         |
| ----------------------------------------- | ------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `npx shadcn-ui@latest add`                | `npx shadcn@latest add`                     | shadcn CLI renamed to `shadcn` (not `shadcn-ui`) | Use `shadcn@latest`, not `shadcn-ui@latest` — confirmed version 3.8.5 on this system                                           |
| Tailwind v4 `@theme` directive            | Tailwind v3 `tailwind.config.js`            | This project is on Tailwind v3                   | Do NOT use v4 `@theme` directive — use `tailwind.config.js` extend for any custom values                                       |
| HSL CSS variables + opacity modifier      | Raw hex CSS variables (after Phase 1)       | Phase 1 of this project                          | `bg-card/50` opacity syntax will NOT work post-Phase 1 migration                                                               |
| `backdrop-filter` animated in transitions | `backdrop-filter` excluded from transitions | Performance research                             | Never animate `backdrop-filter` — GPU compositing cost is high; only animate box-shadow, background-color, color, border-color |

**Deprecated/outdated:**

- `npx shadcn-ui@latest`: Old CLI name, replaced by `npx shadcn@latest` as of ~2024
- `filter: hue-rotate()` for color transitions: Only useful for full-spectrum hue animations; for theme switching between two fixed palettes, standard `transition: background-color` is correct

## Open Questions

1. **What exact CSS custom property value will `--primary` have in Glass Purple after Phase 1?**
   - What we know: Phase 1 migrates to raw hex. Glass Purple is defined in Phase 1 CSS-05 under `[data-theme="glass"]`. The brand color is `#1b5fd0` for Daylight. Glass Purple presumably uses a purple variant.
   - What's unclear: The exact purple value for `--primary` in Glass Purple has not been specified in the requirements or STATE.md. The glow color in CMP-05 should match this value.
   - Recommendation: The planner should note that the button glow `box-shadow` color MUST match the `--primary` value from Phase 1's Glass Purple CSS variables. Use `var(--primary)` in the box-shadow with a helper: `box-shadow: 0 0 16px 4px color-mix(in srgb, var(--primary) 50%, transparent)` (if CSS `color-mix()` is acceptable) or hard-code a purple rgba that matches.

2. **Should Card in Daylight explicitly disable backdrop-filter or rely on absence of the `[data-theme="glass"]` rule?**
   - What we know: The `[data-theme="glass"]` selector only applies when the attribute is present. When absent (Daylight), no blur rule fires.
   - What's unclear: If other themes are added later, the Card will have no blur by default — which is correct behavior.
   - Recommendation: Rely on absence of the selector. No `[data-theme="daylight"] .bg-card { backdrop-filter: none }` rule is needed.

3. **Pre-existing TypeScript build errors — should Phase 4 fix them or is there a prior phase commitment?**
   - What we know: `TakeAssessment.test.tsx` has errors due to missing `@testing-library/react` types and missing `toBeInTheDocument` on `Assertion<any>`. These fail both `npm run typecheck` and `npm run build` before any Phase 4 work.
   - What's unclear: Whether Phases 1–3 are expected to resolve this first.
   - Recommendation: Include a Wave 0 task in Phase 4 to fix the build baseline. The simplest fix is to ensure `@testing-library/jest-dom` types are correctly referenced and `@testing-library/react` is installed (it is in devDependencies but may not be installed in `node_modules`). Run `npm install` in `app/` as a first step.

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` (key absent). Skipping this section.

## Sources

### Primary (HIGH confidence)

- Official Tailwind v3 docs (v3.tailwindcss.com/docs/backdrop-blur) — backdrop-blur-md = 12px confirmed
- Official shadcn/ui CLI docs (ui.shadcn.com/docs/cli) — `npx shadcn@latest add` syntax confirmed; multiple components in one command supported
- shadcn/ui component pages (Sheet, Tooltip, Scroll Area, Popover, Checkbox, Switch) — all are Radix-backed, `pnpm dlx shadcn@latest add [name]` pattern
- `app/components.json` — style: "new-york", tsx: true, cssVariables: true — shadcn CLI configuration confirmed
- `app/src/components/ui/button.tsx` — `bg-primary text-primary-foreground hover:bg-primary/90` semantic tokens confirmed
- `app/src/components/ui/card.tsx` — `bg-card text-card-foreground` semantic tokens confirmed
- `app/src/index.css` — HSL-format CSS variables (Phase 1 will convert to hex); `@layer base` pattern confirmed
- `app/package.json` — Tailwind v3.4.17, shadcn CLI 3.8.5 installed globally, no Radix scroll-area/tooltip/popover/checkbox/switch yet present
- `app/vite.config.ts` — Vitest configured with jsdom, test: true, includes `src/**/*.test.{ts,tsx}`

### Secondary (MEDIUM confidence)

- joshwcomeau.com/css/backdrop-filter — stacking context requirements for backdrop-filter (multiple sources agree)
- dev.to/cataon — CSS variable + `* { transition }` pattern for smooth theme switching (matches MDN CSS transitions spec)
- modern-css.com/frosted-glass-effect — confirmed rgba + backdrop-filter combination requirement

### Tertiary (LOW confidence)

- WebSearch: `[data-theme="glass"] .bg-card` selector pattern — verified structurally correct but no single authoritative source; based on CSS cascade spec behavior

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all tools confirmed in `package.json` and `components.json`; CLI version confirmed at 3.8.5
- Architecture: HIGH — component source files read directly; shadcn CLI docs verified; CSS patterns confirmed via official Tailwind v3 docs
- Pitfalls: HIGH for TypeScript issue (confirmed by running `npm run build`); MEDIUM for performance and stacking context (spec-based, manual validation required)

**Research date:** 2026-02-24
**Valid until:** 2026-04-24 (stable — Tailwind v3 and shadcn patterns are stable; 60-day window)
