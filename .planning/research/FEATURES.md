# Feature Research

**Domain:** Premium UI theming — 2-theme system (Daylight light + Glass Purple dark/glass) for React admin dashboard
**Researched:** 2026-02-23
**Confidence:** HIGH (CSS/theme patterns), HIGH (SurveyJS theming), MEDIUM (glassmorphism element selection)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features a 2-theme system cannot ship without. Missing = product feels broken or incomplete.

| Feature                                    | Why Expected                                                                   | Complexity | Notes                                                                                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSS variable token migration (HSL → hex)   | Every themed component depends on this; all dark mode classes break without it | MEDIUM     | Atomic swap: `--primary: 221 76% 46%` consumed via `hsl(var(...))` → `--primary: #1b5fd0` consumed via `var(...)`. Tailwind config + index.css + all primary-500 class usages must move in one commit.         |
| ThemeContext with localStorage persistence | Users expect their choice to survive page reload                               | LOW        | React Context + `localStorage.getItem('theme')` on init. Set `data-theme` attribute on `<html>`. Two values: `'daylight'` \| `'glass'`.                                                                        |
| FOUC prevention (no white flash on load)   | White flash on dark page load signals amateur implementation                   | MEDIUM     | Blocking `<script>` in `index.html` `<head>` reads localStorage and sets `data-theme` before React mounts. ~12µs cost, prevents flash entirely.                                                                |
| Sun/Moon toggle button                     | Users navigate dark mode by icon convention; this is muscle memory             | LOW        | Single button with lucide-react `Sun` / `Moon` icons. No dropdown needed for 2 themes. Place in sidebar header (admin) and page header (student).                                                              |
| Full semantic color coverage               | Hardcoded `bg-white`, `bg-gray-50`, `text-gray-900` break in Glass Purple      | HIGH       | Sweep all TSX files replacing hardcoded grays/whites with semantic tokens (`bg-background`, `text-foreground`, `bg-muted`, etc.). AdminLayout currently uses `bg-gray-50` and `bg-white` — these must go.      |
| Sidebar background theming                 | Sidebar is the frame users see constantly; an unthemed sidebar is jarring      | LOW        | Sidebar must use theme tokens, not hardcoded `bg-white`. Active nav item needs theme-aware highlight.                                                                                                          |
| Card/panel theming                         | Cards are the primary content surface; unthemed cards look broken in dark      | LOW        | shadcn Card uses `bg-card` token — works if CSS variable migration is complete. Verify no hardcoded overrides exist.                                                                                           |
| Dialog/modal theming                       | Modals overlay the page; unthemed modals create harsh contrast breaks          | LOW        | shadcn Dialog, AlertDialog use `bg-popover` / `bg-background` tokens. Audit for hardcoded colors.                                                                                                              |
| Table theming                              | Tables appear on every admin page; unthemed table rows are very visible        | LOW        | Table rows use `bg-background` / `bg-muted` for alternating rows. Header needs `bg-muted` token.                                                                                                               |
| Form input theming                         | Login, assessment creation, student info — all have inputs                     | LOW        | shadcn Input uses `bg-background border-input` — works after migration. Verify focus rings use `ring-primary`.                                                                                                 |
| Button theming                             | Every page has buttons; primary button glow is a Glass Purple differentiator   | LOW        | Primary button in Glass Purple gets subtle glow: `shadow-[0_0_12px_rgba(147,51,234,0.4)]`. Outline buttons need border token update.                                                                           |
| SurveyJS dark theme (assessment taker)     | Assessment is the core feature; unthemed SurveyJS is the most visible failure  | HIGH       | `survey.applyTheme({ colorPalette: 'dark', cssVariables: { '--sjs-primary-backcolor': '#7c3aed', ... } })` when Glass Purple active. Existing `.sd-root-modern *` border-color revert block must be preserved. |
| Mobile responsive sidebar → sheet drawer   | Sidebar collapses on mobile; this is expected behavior for any 2026 dashboard  | MEDIUM     | shadcn Sheet component for mobile. Fixed sidebar on `lg:` breakpoint. Hamburger toggle on `< lg`.                                                                                                              |
| Body/page background Glass Purple effect   | Glass Purple needs a dark gradient base or glass panels look flat              | MEDIUM     | `body` gets `background: radial-gradient(ellipse at top-left, #1e1040 0%, #0f0726 100%)` in glass theme. Without this, glass panels have nothing to blur.                                                      |

### Differentiators (Competitive Advantage)

Features that elevate this from "dark mode exists" to "this looks premium."

| Feature                                    | Value Proposition                                                                           | Complexity | Notes                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Glass card backdrop blur                   | Cards appear to float over the gradient background; distinctively premium                   | MEDIUM     | `.glass` utility class: `background: rgba(255,255,255,0.05); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1)`. Apply to sidebar, main content cards in Glass Purple. NOT to tables (readability).                                                                                                         |
| Sun/moon icon morph animation              | Premium feel; smooth visual communication of state change                                   | LOW        | CSS transform scale + opacity crossfade on toggle. Or View Transitions API for full-page sweep. toggles.dev has drop-in SVG solutions. The animated transition must be ≤200ms to feel snappy.                                                                                                                                  |
| Smooth color transition on theme switch    | Prevents jarring instant flash; feels polished                                              | LOW        | `body { transition: background-color 0.25s ease, color 0.15s ease; }`. Apply to sidebar too. Do NOT transition backdrop-filter (expensive, causes jank).                                                                                                                                                                       |
| Glass sidebar with blur                    | Sidebar is the most persistent UI element; glass treatment reinforces theme identity        | MEDIUM     | Sidebar: `backdrop-filter: blur(16px); background: rgba(15, 7, 38, 0.7)`. Requires the gradient body background to be visible behind it (use `position: fixed` with no opaque background behind sidebar).                                                                                                                      |
| Active nav item glass indicator            | Glass Purple active state: glowing pill or left border with glow                            | LOW        | Active nav item: `background: rgba(147, 51, 234, 0.2); border-left: 3px solid #9333ea; box-shadow: inset 0 0 8px rgba(147,51,234,0.15)`. Daylight: simple `bg-primary/10 text-primary border-l-2 border-primary`.                                                                                                              |
| Glass Purple primary button glow           | Action buttons subtly pulse with purple glow; communicates interactivity                    | LOW        | `hover:shadow-[0_0_16px_rgba(147,51,234,0.5)]` on primary variant in glass theme. Keep transition on box-shadow only.                                                                                                                                                                                                          |
| SurveyJS Glass Purple sync                 | Assessment questions match the app aesthetic in glass mode                                  | HIGH       | Custom theme object: `{ colorPalette: 'dark', cssVariables: { '--sjs-primary-backcolor': '#7c3aed', '--sjs-general-backcolor': 'rgba(255,255,255,0.05)', '--sjs-general-backcolor-dark': 'rgba(0,0,0,0.2)' } }`. This requires reading theme context inside TakeAssessment.tsx and calling `model.applyTheme()` conditionally. |
| System preference detection on first visit | Users who use system dark mode get Glass Purple without manual toggle                       | LOW        | In the FOUC script and ThemeContext init: if no localStorage key, check `window.matchMedia('(prefers-color-scheme: dark)').matches`. Map `true` → `glass`, `false` → `daylight`.                                                                                                                                               |
| Badge/status pill theming                  | Colored status badges (active, expired, pending) need glass-aware variants                  | LOW        | StatusBadge component currently uses hardcoded Tailwind color classes. Add `dark:` variants or refactor to use semantic tokens with theme-specific opacity.                                                                                                                                                                    |
| Skeleton loader theming                    | Skeleton loaders appear during data fetch; unthemed skeletons are very visible in dark mode | LOW        | shadcn Skeleton uses `bg-muted` — works after migration. Verify `animate-pulse` is visible in glass theme (may need adjusted muted color).                                                                                                                                                                                     |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like good additions but should be explicitly excluded from this scope.

| Feature                                                       | Why Requested                                      | Why Problematic                                                                                                                                                                                                                                 | Alternative                                                                                  |
| ------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Three-way toggle (light / dark / system)                      | Feels more complete; matches macOS/Windows pattern | Adds UI complexity (dropdown or 3-button group) for no real gain when only 2 themes exist. System preference detection on first load covers the "auto" case without a third state visible in the UI.                                            | Detect system preference silently on first load; simple sun/moon toggle thereafter.          |
| Per-org theme setting                                         | Allows orgs to brand their portal                  | Multi-tenant theme config requires DB schema, admin UI, and CSS injection per org — weeks of scope. This is a v2+ feature.                                                                                                                      | localStorage user preference is sufficient for the current 2-theme scope.                    |
| Animated background particles / aurora                        | Seen in glassmorphism showcases; very dramatic     | Significant runtime performance cost. `backdrop-filter` is already GPU-heavy; adding animated backgrounds causes jank on lower-end devices. Students on Chromebooks taking assessments will notice.                                             | Static radial gradient background achieves glass feel without performance penalty.           |
| CSS animation on backdrop-filter                              | Makes glass cards appear to "breathe"              | `backdrop-filter` animation is expensive — the blur must be recalculated every frame. NN/G and MDN both warn this is a common glassmorphism perf trap.                                                                                          | Use box-shadow and border opacity animations instead; these are cheap.                       |
| SurveyJS Creator (admin editor) dark mode                     | Consistent theming in the question builder         | SurveyJS Creator has its own separate CSS file (`survey-creator-core.min.css`) with different theming hooks. Theming it requires overriding hundreds of internal classes. The payoff is low since admins are sophisticated users, not students. | Leave SurveyJS Creator in its default light styling. Document this as a known limitation.    |
| Theme-per-page or section                                     | Some pages light, some dark                        | Breaks user expectations; causes layout re-render when navigating. Tailwind's dark mode class strategy requires a single root-level class.                                                                                                      | Consistent theme across all pages; toggle applies globally.                                  |
| Custom color picker (user-defined theme)                      | Power user personalization                         | Infinite design permutations to test, accessibility implications for each. Scope explosion for a 2-theme milestone.                                                                                                                             | Two well-designed themes > infinite poorly-tested themes.                                    |
| CSS `@starting-style` / View Transitions API for theme switch | Enables full-page flip animation                   | View Transitions API is still a progressive enhancement, not baseline. Fallback handling adds complexity.                                                                                                                                       | Simple `transition` on `background-color` / `color` is sufficient and universally supported. |

---

## Feature Dependencies

```
[CSS variable token migration (HSL → hex)]
    └──required by──> [All themed components]
    └──required by──> [Tailwind dark: class resolution]
    └──required by──> [ThemeContext / data-theme attribute]

[ThemeContext with localStorage]
    └──required by──> [Sun/Moon toggle button]
    └──required by──> [SurveyJS Glass Purple sync]
    └──required by──> [Body gradient background]
    └──enhances──>    [System preference detection]

[FOUC prevention script]
    └──depends on──>  [CSS variable token migration] (variables must exist before script runs)
    └──prevents──>    [White flash on Glass Purple load]

[Body gradient background (Glass Purple)]
    └──required by──> [Glass card backdrop blur] (no background = nothing to blur through)
    └──required by──> [Glass sidebar with blur]

[Glass card backdrop blur]
    └──enhances──>    [Glass sidebar with blur]
    └──conflicts──>   [CSS animation on backdrop-filter] (ANTI-FEATURE — don't combine)

[Mobile sheet drawer]
    └──depends on──>  [shadcn Sheet component] (not yet installed per PROJECT.md)
    └──depends on──>  [Sidebar navigation] (replaces current horizontal tab nav)

[SurveyJS Glass Purple sync]
    └──depends on──>  [ThemeContext] (must read current theme to call correct applyTheme)
    └──depends on──>  [CSS variable token migration] (SurveyJS CSS variables use different namespace --sjs-*)
    └──does NOT conflict with──> [existing .sd-root-modern border-color revert block]

[Full semantic color coverage sweep]
    └──depends on──>  [CSS variable token migration] (tokens must exist before sweep)
    └──blocks──>      [any other feature being complete] (hardcoded colors undo everything)
```

### Dependency Notes

- **CSS variable migration must be phase 1, commit 1.** Everything else builds on it. A partial migration state breaks all `dark:` classes simultaneously.
- **FOUC script must land in the same phase as ThemeContext.** If ThemeContext lands without the blocking script, users with Glass Purple saved in localStorage see a white flash on every page load.
- **Body gradient must precede glass blur.** Glass panels with `backdrop-filter: blur()` over a flat white or gray background look like frosted nothing — the gradient gives them something to blur through.
- **SurveyJS Glass Purple sync is independent of SurveyJS Creator theming.** `TakeAssessment.tsx` uses `survey-core` with `survey.applyTheme()` — this is straightforward. The Creator (`SurveyEditor.tsx`) is a separate surface that should not be themed (anti-feature).
- **Sheet component dependency:** The mobile sidebar drawer requires shadcn Sheet, which PROJECT.md lists as not yet installed. This must be added before mobile sidebar work.

---

## MVP Definition

### Launch With (v1 — this milestone)

The theme system is only complete when all of these are in place. Shipping partial breaks the experience.

- [x] CSS variable token migration (HSL → hex) — foundation; nothing else works without it
- [x] ThemeContext + localStorage + FOUC prevention — user preference persists and loads without flash
- [x] Sun/Moon toggle in admin sidebar + student header — the UI affordance users look for
- [x] System preference detection on first visit — Glass Purple users get it automatically
- [x] Admin sidebar navigation (replaces horizontal tabs) — prerequisite for sidebar toggle placement
- [x] Body gradient background for Glass Purple — prerequisite for glass blur effects
- [x] Glass card + sidebar backdrop blur — the defining visual feature of the Glass Purple theme
- [x] Full semantic color sweep (remove all hardcoded bg-white/gray-50) — table stakes; without this dark mode is patchy
- [x] SurveyJS dark theme for TakeAssessment (student) — assessments are the core feature; must look correct
- [x] Smooth color transition on theme switch — prevents jarring flash; low cost, high polish
- [x] Mobile sidebar → sheet drawer — responsive is non-negotiable

### Add After Validation (v1.x)

Features worth adding once v1 is stable, but not blocking launch.

- [ ] Active nav item glass indicator refinement — can ship with basic active state first, polish after
- [ ] Primary button glow animation — nice-to-have; add if not causing perf issues
- [ ] Badge/status pill dark variants — small surface; functional is acceptable for v1

### Future Consideration (v2+)

- [ ] Per-org theme preference — needs DB schema + admin UI; significant scope
- [ ] SurveyJS Creator dark mode — low instructor value, high effort
- [ ] Third theme (e.g., high-contrast accessibility) — only if user research demands it

---

## Feature Prioritization Matrix

| Feature                      | User Value | Implementation Cost | Priority |
| ---------------------------- | ---------- | ------------------- | -------- |
| CSS variable token migration | HIGH       | MEDIUM              | P1       |
| FOUC prevention              | HIGH       | LOW                 | P1       |
| ThemeContext + localStorage  | HIGH       | LOW                 | P1       |
| Sun/Moon toggle              | HIGH       | LOW                 | P1       |
| Full semantic color sweep    | HIGH       | HIGH                | P1       |
| Body gradient (Glass Purple) | HIGH       | LOW                 | P1       |
| Admin sidebar navigation     | HIGH       | MEDIUM              | P1       |
| Glass card backdrop blur     | HIGH       | MEDIUM              | P1       |
| SurveyJS Glass Purple sync   | HIGH       | MEDIUM              | P1       |
| Mobile sheet drawer          | HIGH       | MEDIUM              | P1       |
| Smooth theme transition      | MEDIUM     | LOW                 | P2       |
| Active nav glass indicator   | MEDIUM     | LOW                 | P2       |
| System preference detection  | MEDIUM     | LOW                 | P2       |
| Glass sidebar blur           | MEDIUM     | LOW                 | P2       |
| Primary button glow          | LOW        | LOW                 | P2       |
| Badge theming                | LOW        | LOW                 | P3       |
| Skeleton loader theming      | LOW        | LOW                 | P3       |

**Priority key:**

- P1: Must have for launch — theme system is broken without it
- P2: Should have — polish that makes Glass Purple feel premium
- P3: Nice to have — minor surfaces, low return

---

## SurveyJS Theming: Specific Findings

This surface deserves detailed notes because it has its own theming system separate from Tailwind.

**Two surfaces, two different approaches:**

1. **TakeAssessment.tsx (student-facing):** Uses `survey-core` + `survey-react-ui`. Already calls `model.applyTheme({ cssVariables: { '--sjs-primary-backcolor': '#1b5fd0', ... } })`. To add Glass Purple support, read the theme from ThemeContext inside TakeAssessment and call `applyTheme` with different variables per theme.

2. **SurveyEditor.tsx (admin creator):** Uses `survey-creator-core` + `survey-creator-react`. Has its own CSS bundle (`survey-creator-core.min.css`). Theming this is complex and low value — leave at default.

**SurveyJS CSS variable namespace:** `--sjs-*` (not `--`) — completely separate from app CSS variables.

**Recommended Glass Purple SurveyJS theme object:**

```javascript
{
  colorPalette: 'dark',
  cssVariables: {
    '--sjs-primary-backcolor': '#7c3aed',          // purple primary
    '--sjs-primary-backcolor-light': 'rgba(124, 58, 237, 0.15)',
    '--sjs-primary-backcolor-dark': '#6d28d9',
    '--sjs-primary-forecolor': '#ffffff',
    '--sjs-general-backcolor': 'rgba(30, 16, 64, 0.95)',    // dark panel
    '--sjs-general-backcolor-dark': 'rgba(15, 7, 38, 0.98)',
    '--sjs-general-forecolor': 'rgba(255, 255, 255, 0.9)',
    '--sjs-border-default': 'rgba(255, 255, 255, 0.12)',
  }
}
```

**Constraint:** The existing `.sd-root-modern *` border-color revert rule in `index.css` must be preserved. SurveyJS theme overrides are additive — this block prevents Tailwind's global border-color from leaking into SurveyJS internals.

---

## Glassmorphism: What Gets the Glass Treatment

Based on NN/G research and premium dashboard analysis, selective application is essential. Applying glass to everything makes the interface muddy and unreadable.

**Apply glass treatment to:**

- Sidebar (fixed, persistent — defines the theme identity)
- Main content cards (primary data containers)
- Dialog/modal overlays (already float above content)
- Notification/alert banners in Glass Purple context

**Do NOT apply glass treatment to:**

- Data tables (text-heavy; blur behind rows = readability failure)
- Form inputs (glass inputs are a known accessibility anti-pattern)
- Dropdown menus / selects (too small; blur causes visual noise)
- Skeleton loaders (would show through to background; disorienting)
- SurveyJS question bodies (SurveyJS manages its own surface; don't fight it)
- Buttons (use glow shadow instead of blur; buttons are too small for blur to read)

**Glass parameters for this project:**

- `backdrop-filter: blur(12px)` for cards, `blur(16px)` for sidebar
- `background: rgba(255, 255, 255, 0.05)` — very subtle tint
- `border: 1px solid rgba(255, 255, 255, 0.10)` — subtle edge definition
- Do NOT animate `backdrop-filter` — perf trap confirmed by NN/G

---

## Theme Toggle UX: Decision Record

**Pattern chosen:** Single sun/moon icon button (not dropdown, not three-way)

**Rationale:**

- Only 2 themes — a dropdown is over-engineered
- Sun/moon is universal muscle memory (every major OS uses this)
- System preference handled silently at first load, so no third "auto" state is needed in the UI
- Placement: sidebar header (admin), page header (student)

**Animation:** Icon crossfade with scale transform (Sun → Moon on click to Glass Purple):

```css
.theme-toggle-icon {
  transition:
    transform 0.15s ease,
    opacity 0.15s ease;
}
```

**FOUC prevention pattern:**

```html
<!-- index.html <head>, before any stylesheets -->
<script>
  (function () {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'glass' : 'daylight');
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

---

## Sources

- [SurveyJS Themes and Styles documentation](https://surveyjs.io/form-library/documentation/manage-default-themes-and-styles) — HIGH confidence (official docs)
- [Glassmorphism: Definition and Best Practices — NN/G](https://www.nngroup.com/articles/glassmorphism/) — HIGH confidence (primary research)
- [The Quest for the Perfect Dark Mode — Josh W. Comeau](https://www.joshwcomeau.com/react/dark-mode/) — HIGH confidence (widely-cited, FOUC patterns)
- [Dark mode — Tailwind CSS docs](https://tailwindcss.com/docs/dark-mode) — HIGH confidence (official)
- [Tailwind v4 — shadcn/ui](https://ui.shadcn.com/docs/tailwind-v4) — HIGH confidence (official)
- [Building a Smooth Dark/Light Mode Switch — DEV Community](https://dev.to/web_dev-usman/building-a-smooth-darklight-mode-switch-with-modern-css-features-3jlc) — MEDIUM confidence
- [Theme Toggles (animated SVG toggles)](https://toggles.dev/) — MEDIUM confidence
- [Glassmorphism admin dashboard components — UX Pilot](https://uxpilot.ai/blogs/glassmorphism-ui) — MEDIUM confidence

---

_Feature research for: Premium UI theming — 2-theme system (Daylight + Glass Purple)_
_Researched: 2026-02-23_
