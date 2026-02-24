# Phase 3: Admin Sidebar & AppShell - Research

**Researched:** 2026-02-24
**Domain:** React layout architecture — fixed sidebar, shadcn/ui Sheet drawer, NavLink active states, Tailwind responsive AppShell, glass-blur CSS
**Confidence:** HIGH

---

## Summary

Phase 3 replaces the existing horizontal tab header in `AdminLayout.tsx` with a fixed left-sidebar AppShell. The sidebar is always-visible on desktop (`md:` breakpoint and above) and transforms into a Sheet (slide-in drawer) on mobile, triggered by a hamburger button in a fixed top header bar. The layout uses a `md:pl-64` offset on the main content area to clear the sidebar — a standard Tailwind admin shell pattern.

The implementation is entirely self-contained within the React/Tailwind stack already present in the project. One new shadcn/ui component (`Sheet`) is needed; it is based on `@radix-ui/react-dialog` which is already installed (v1.1.15). The existing `NavLink` component from `react-router-dom` handles active state via its `className` function prop. The `useTheme()` hook from Phase 2 enables conditional sidebar styling (glass blur in Glass Purple, solid in Daylight). Phase 2 ThemeProvider must be in place before glass effects work, but the structural sidebar replacement can proceed in isolation.

Glass Purple sidebar blur requires `backdrop-filter: blur(16px)` (`backdrop-blur-lg` in Tailwind v3). The glass sidebar must be a sibling to the main content — not a child — to avoid the `position: fixed` + `filter` stacking context trap that breaks viewport-relative positioning.

**Primary recommendation:** Build a single `AppShell.tsx` component that owns sidebar state, renders the fixed desktop sidebar and the mobile Sheet sidebar as two parallel trees, and replaces `AdminLayout.tsx` as the layout component in `App.tsx`. Do not attempt to toggle a single sidebar component between fixed/sheet modes — the DOM requirements differ.

---

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                                                                              | Research Support                                                                                                                  |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| LAY-01 | Admin sidebar navigation with links: Dashboard, Assessments, Question Banks, Attendance, Students, Bug Reports, Instructors (owner-only) | NavLink pattern with `isActive` className; `user.role === 'owner'` guard from `useAuthStore` already used in existing AdminLayout |
| LAY-02 | Sidebar fixed left (w-64) on desktop, hidden on mobile                                                                                   | `fixed inset-y-0 left-0 w-64 hidden md:flex md:flex-col` — standard Tailwind responsive sidebar pattern                           |
| LAY-03 | Mobile sidebar rendered as Sheet drawer from left with hamburger toggle                                                                  | shadcn/ui `Sheet` + `SheetContent side="left"` + hamburger `Menu` icon from lucide-react; close on nav via `useLocation`          |
| LAY-04 | AppShell layout: sidebar + header + scrollable main content area with md:pl-64 offset                                                    | Main wrapper: `flex min-h-screen`; content: `flex flex-1 flex-col md:pl-64`; mobile header: `md:hidden`                           |
| LAY-05 | Existing `AdminLayout.tsx` replaced by AppShell — all admin routes work through new layout                                               | `App.tsx` swaps `<AdminLayout />` for `<AppShell />` in the `ProtectedRoute` wrapper; route children unchanged                    |
| LAY-06 | Glass Purple body background: radial gradient from purple-dark tones                                                                     | `[data-theme="glass-purple"] body` CSS rule in `index.css`; radial-gradient with deep purple stops                                |
| LAY-07 | Glass sidebar: `backdrop-filter: blur(16px)` with semi-transparent background in Glass Purple                                            | `backdrop-blur-lg` (Tailwind v3 = 16px); requires `bg-sidebar/80` or raw rgba; sibling DOM structure avoids stacking context trap |
| LAY-08 | Active nav item: glass glow indicator in Glass Purple, simple primary highlight in Daylight                                              | `NavLink` className function; separate CSS classes for `[data-theme="glass-purple"] .nav-active` and `.nav-active`                |

</phase_requirements>

---

## Standard Stack

### Core

| Library                | Version                           | Purpose                                   | Why Standard                                                                                |
| ---------------------- | --------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| react-router-dom       | ^7.6.1 (already installed)        | `NavLink` with `isActive`, `useLocation`  | Already in project; `NavLink.className` function prop is the canonical active-state pattern |
| shadcn/ui Sheet        | via `npx shadcn@latest add sheet` | Mobile sidebar drawer                     | Built on existing `@radix-ui/react-dialog` ^1.1.15 (already installed); zero new peer deps  |
| lucide-react           | ^0.513.0 (already installed)      | `Menu` icon for hamburger button          | Already installed; `Menu` icon is the canonical hamburger symbol                            |
| Tailwind CSS v3        | ^3.4.17 (already installed)       | Responsive layout, backdrop-blur, z-index | `backdrop-blur-lg` = 16px in v3; `hidden md:flex` for responsive show/hide                  |
| useAuthStore (Zustand) | ^5.0.9 (already installed)        | `user.role === 'owner'` check             | Already used in existing `AdminLayout.tsx` for Instructors link guard                       |

### Supporting

| Library            | Version       | Purpose                            | When to Use                                                            |
| ------------------ | ------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| useTheme (Phase 2) | local context | Conditional glass/daylight styling | Active nav glow effect and sidebar glass blur require theme awareness  |
| cn() utility       | lib/utils.ts  | Conditional class merging          | Combining base + active classes on NavLink; merging responsive classes |

### Alternatives Considered

| Instead of                   | Could Use                        | Tradeoff                                                                                |
| ---------------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| shadcn Sheet for mobile      | Custom div with CSS transform    | Sheet handles focus trap, aria-modal, keyboard dismiss, overlay — don't hand-roll these |
| NavLink className function   | Manual useLocation + Link        | NavLink handles exact matching, `aria-current="page"`, and state; use it                |
| `md:pl-64` offset on main    | CSS Grid `grid-cols-[256px_1fr]` | Flexbox + padding simpler to maintain; grid would need `md:grid` toggle — more complex  |
| Fixed sidebar always visible | Collapsible sidebar              | Requirements specify fixed (w-64) on desktop — no collapse needed in this phase         |

**Installation:**

```bash
cd app && npx shadcn@latest add sheet
```

Note: `@radix-ui/react-dialog` is already installed at ^1.1.15 — the Sheet component will use it without pulling in new dependencies.

---

## Architecture Patterns

### Recommended Project Structure

```
app/src/
├── components/
│   ├── AppShell.tsx           # NEW: replaces AdminLayout.tsx; owns sidebar state
│   ├── AdminLayout.tsx        # DELETED: all functionality moves to AppShell
│   └── ui/
│       └── sheet.tsx          # NEW: added by shadcn CLI
├── contexts/
│   └── ThemeContext.tsx       # From Phase 2: useTheme() consumed by AppShell
└── App.tsx                    # UPDATED: AdminLayout → AppShell swap
```

The `AppShell.tsx` component is the sole new source file. `AdminLayout.tsx` is deleted. `App.tsx` changes one import and one JSX tag.

---

### Pattern 1: AppShell with Parallel Desktop/Mobile Sidebars

**What:** Two sidebar trees live in the same component. The desktop sidebar is a fixed `<aside>` with `hidden md:flex`. The mobile sidebar is a Sheet that renders behind a portal — only open when `isMobileOpen` state is true. The main content area has `md:pl-64` to clear the desktop sidebar.

**When to use:** Required layout structure for this phase. The two-tree approach avoids the fixed/sheet toggle complexity.

**Example:**

```tsx
// Source: Tailwind CSS Sidebar Layouts pattern + shadcn Sheet docs
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import AdminSidebar from '@/components/AdminSidebar';

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="fixed inset-y-0 left-0 z-30 w-64 hidden md:flex md:flex-col">
        <AdminSidebar />
      </aside>

      {/* Mobile sidebar — Sheet drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <AdminSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Content area */}
      <div className="flex flex-1 flex-col md:pl-64">
        {/* Mobile header with hamburger */}
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b bg-background px-4 py-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
          <span className="font-semibold">MedEdPrep</span>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

---

### Pattern 2: AdminSidebar with NavLink Active States

**What:** A dedicated `AdminSidebar` component receives an optional `onNavigate` callback (called by mobile Sheet to close drawer on nav). Uses `NavLink` with a `className` function for active state. The `end` prop on the Dashboard link prevents it being active on all routes.

**When to use:** Both desktop fixed sidebar and mobile Sheet share this component — the single source of truth for nav links.

**Example:**

```tsx
// Source: React Router NavLink docs (reactrouter.com/api/components/NavLink)
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth';
import ThemeToggle from '@/components/ThemeToggle';

interface AdminSidebarProps {
  onNavigate?: () => void;
}

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/assessments', label: 'Assessments' },
  { to: '/question-banks', label: 'Question Banks' },
  { to: '/sessions', label: 'Attendance' },
  { to: '/students', label: 'Students' },
  { to: '/bug-reports', label: 'Bug Reports' },
] as const;

export default function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex h-full flex-col">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-4 border-b">
        <span className="font-semibold">MedEdPrep</span>
        <ThemeToggle />
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'nav-active bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            {label}
          </NavLink>
        ))}
        {user?.role === 'owner' && (
          <NavLink
            to="/instructors"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'nav-active bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            Instructors
          </NavLink>
        )}
      </nav>

      {/* Footer: user + logout */}
      <div className="border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
```

---

### Pattern 3: Glass Purple Sidebar Styling via CSS (not inline React)

**What:** Glass sidebar appearance (LAY-07) and body gradient (LAY-06) are controlled via CSS in `index.css` under `[data-theme="glass-purple"]` selectors — NOT via `useTheme()` reads in JSX. Active nav glow (LAY-08) is also CSS-only using the `.nav-active` class.

**Why:** Phase 2 research established that components styled purely by CSS variables never call `useTheme()`. The `[data-theme]` attribute on `<html>` activates the rules automatically. Zero React re-renders are triggered by theme changes.

**Example (additions to index.css):**

```css
/* LAY-06: Body gradient in Glass Purple */
[data-theme='glass-purple'] body {
  background: radial-gradient(ellipse at top, #2d1b69 0%, #0f0a1e 100%);
}

/* LAY-07: Glass sidebar blur */
[data-theme='glass-purple'] .sidebar-glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

/* LAY-08: Active nav item - glass glow */
[data-theme='glass-purple'] .nav-active {
  background: rgba(139, 92, 246, 0.2);
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
  color: #c4b5fd;
}

/* LAY-08: Active nav item - Daylight primary highlight */
[data-theme='daylight'] .nav-active {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}
```

The `sidebar-glass` class is added to the `<div>` inside the desktop `<aside>` and to `SheetContent`'s inner container.

---

### Pattern 4: Close Mobile Sheet on Navigation

**What:** When a NavLink is clicked in the mobile Sheet, the drawer must close. This is achieved by passing an `onNavigate` callback to `AdminSidebar` that calls `setMobileOpen(false)`.

**When to use:** Required for mobile UX — without this, the Sheet stays open after navigation.

**Example:**

```tsx
// In AdminSidebar: each NavLink has onClick={onNavigate}
<NavLink onClick={onNavigate} ...>Dashboard</NavLink>

// Alternative using useEffect + useLocation (for close-on-back-nav):
const location = useLocation();
useEffect(() => {
  setMobileOpen(false);
}, [location.pathname]);
```

**Recommendation:** Use the `onClick` prop on each NavLink (simpler). The `useLocation` approach additionally handles browser back-button navigation closing the drawer — add it as a bonus if desired.

---

### Anti-Patterns to Avoid

- **Don't nest the fixed sidebar inside the content flex container.** The fixed sidebar must be a direct child of the `min-h-screen` wrapper, sibling to the scrollable content div — not nested inside it.
- **Don't apply `backdrop-filter` to the parent of `position: fixed` elements.** A container element with `backdrop-filter` creates a new stacking context; `position: fixed` children become fixed relative to that context, not the viewport. The sidebar wrapper must NOT have `backdrop-filter` — only the inner sidebar `div` gets it.
- **Don't use the `end` prop on every NavLink.** Only the root Dashboard link (`to="/"`) needs `end: true`. Without `end`, the Dashboard NavLink would be active on `/assessments`, `/students`, etc. All other links are specific paths and match correctly without it.
- **Don't put `user.role === 'owner'` outside the component.** The role check must happen inside the component rendering the sidebar, accessing `useAuthStore` — same as current `AdminLayout.tsx` pattern.
- **Don't delete AdminLayout.tsx before App.tsx is updated.** These are a paired atomic change. If one is done without the other, all admin routes break.
- **Don't use Tailwind's `dark:` utilities for glass effects.** This project uses `[data-theme]` CSS selectors exclusively. Adding `dark:` classes would be incorrect and confusing.

---

## Don't Hand-Roll

| Problem                       | Don't Build                            | Use Instead                        | Why                                                                                            |
| ----------------------------- | -------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| Mobile sidebar drawer         | CSS transform + JS class toggle        | shadcn Sheet                       | Sheet handles: focus trap, `aria-modal`, overlay click-to-dismiss, keyboard Escape, animations |
| Active nav indicator          | Manual `pathname.startsWith()` checks  | NavLink className with `isActive`  | NavLink also sets `aria-current="page"` for accessibility; handles exact matching via `end`    |
| Hamburger button              | Custom SVG or div-based icon           | lucide-react `Menu` icon           | Already installed; consistent sizing, aria-hidden by default                                   |
| Responsive sidebar visibility | JavaScript window.innerWidth listeners | Tailwind `hidden md:flex`          | CSS-only responsive approach has zero JS overhead, no hydration mismatch                       |
| Sidebar scroll                | Custom scrollbar implementation        | `overflow-y-auto` on nav container | Browser native; the sidebar has few items so this is trivial                                   |

**Key insight:** Every interaction primitive needed (modal, focus trap, active link, responsive visibility) is already solved by the installed dependencies. The entire Phase 3 implementation is layout composition, not new capability.

---

## Common Pitfalls

### Pitfall 1: `position: fixed` Inside a Filter/Backdrop-Filter Container

**What goes wrong:** The glass sidebar uses `backdrop-filter: blur(16px)` on the sidebar `<div>`. If that `<div>` is also the `position: fixed` element (or if a parent has `backdrop-filter`), child elements with `position: fixed` will be positioned relative to the filtered container rather than the viewport.

**Why it happens:** `backdrop-filter` creates a new stacking context. CSS `position: fixed` elements are placed relative to their nearest stacking context ancestor, not the viewport, when a stacking context exists.

**How to avoid:** Structure the DOM so that:

1. The `<aside>` element itself has `position: fixed` and `z-index`.
2. An inner `<div class="sidebar-glass">` inside the aside has `backdrop-filter`.
3. NO parent of the `<aside>` has `backdrop-filter`, `transform`, `filter`, or `will-change: transform`.

**Warning signs:** Other `position: fixed` elements (like toasts, modals) shift or display incorrectly when Glass Purple is active.

---

### Pitfall 2: Dashboard NavLink Active on All Admin Routes

**What goes wrong:** `<NavLink to="/">` without `end` prop matches any URL starting with `/` — which is every URL. The Dashboard link appears active regardless of current route.

**Why it happens:** React Router's NavLink uses prefix matching by default. `/` matches everything.

**How to avoid:** Always use `<NavLink to="/" end>` for the root path. In the navItems array, set `end: true` for the Dashboard entry only.

**Warning signs:** Dashboard nav item always highlighted regardless of active page.

---

### Pitfall 3: Mobile Sheet Stays Open After Navigation

**What goes wrong:** User opens mobile sidebar, taps "Assessments", navigates to the page, but the Sheet overlay remains visible.

**Why it happens:** The Sheet's `open` state is managed in `AppShell`. Navigating via `NavLink` does not automatically close the Sheet.

**How to avoid:** Pass `onNavigate={() => setMobileOpen(false)}` to `AdminSidebar` and call it in `onClick` on every `NavLink`. Optionally supplement with `useEffect` on `location.pathname` to handle browser back-navigation.

**Warning signs:** Sheet overlay persists after nav clicks; user must tap the X or overlay to dismiss.

---

### Pitfall 4: TypeScript `noUnusedLocals` / `noUnusedParameters` Strictness

**What goes wrong:** The project has `"noUnusedLocals": true` and `"noUnusedParameters": true` in `tsconfig.json`. Declaring props like `onNavigate?: () => void` without using them in a code path will cause `npm run typecheck` to fail.

**Why it happens:** Strict TypeScript configuration. Optional props that are only called in some render paths can trigger this if not guarded with `?.()`.

**How to avoid:** Use `onNavigate?.()` (optional chaining) in every NavLink's `onClick`. This satisfies TypeScript that the parameter is used and handles the `undefined` case correctly.

**Warning signs:** `npm run typecheck` fails with "Parameter 'onNavigate' is declared but its value is never read."

---

### Pitfall 5: z-index Conflicts Between Desktop Sidebar and Mobile Sheet

**What goes wrong:** The desktop `<aside>` is `z-30` (fixed). The Sheet portal renders at a different z-index. On viewports between mobile and desktop breakpoints, both can be visible simultaneously or the Sheet overlay can be hidden behind the sidebar.

**Why it happens:** Sheet renders via portal at a high z-index. If the desktop sidebar has a higher z-index, it overlays the Sheet.

**How to avoid:** Set the desktop aside to `z-20` and ensure the Sheet overlay (which renders at shadcn's default `z-50`) is always on top. On `md:` breakpoints, the mobile Sheet trigger is hidden (`md:hidden`), so this conflict is unlikely in practice.

**Warning signs:** Sheet drawer appears behind the desktop sidebar on mid-size viewports.

---

### Pitfall 6: `SheetTitle` Accessibility Requirement

**What goes wrong:** Radix UI Dialog (which Sheet extends) requires either a `SheetTitle` or `aria-label` on `SheetContent`. Omitting it causes a console warning and accessibility violation.

**Why it happens:** Radix UI enforces dialog title for screen reader context.

**How to avoid:** Add `<SheetTitle className="sr-only">Navigation</SheetTitle>` inside `SheetContent`. The `sr-only` class hides it visually while providing the accessible label.

**Warning signs:** Console warning: "Warning: Missing 'Description' or 'aria-describedby' for {DialogContent}."

---

## Code Examples

Verified patterns from official sources:

### Sheet Installation (shadcn/ui CLI)

```bash
# From app/ directory
npx shadcn@latest add sheet
```

This generates `app/src/components/ui/sheet.tsx` using the project's existing `components.json` config (`new-york` style, `@/components/ui` alias).

### NavLink with end prop (React Router v7 docs)

```tsx
// Source: https://reactrouter.com/api/components/NavLink
// end prop: only active when URL matches exactly, not just as prefix
<NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
  Dashboard
</NavLink>
```

### Sheet with side="left" (shadcn/ui Sheet docs)

```tsx
// Source: https://ui.shadcn.com/docs/components/sheet
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent side="left" className="w-64 p-0">
    <SheetHeader className="sr-only">
      <SheetTitle>Navigation</SheetTitle>
    </SheetHeader>
    {/* sidebar content */}
  </SheetContent>
</Sheet>;
```

### Tailwind v3 backdrop-blur classes

```
backdrop-blur-sm  = 4px
backdrop-blur     = 8px
backdrop-blur-md  = 12px
backdrop-blur-lg  = 16px   ← Use this for LAY-07 (16px specified)
backdrop-blur-xl  = 24px
backdrop-blur-2xl = 40px
```

Source: https://v3.tailwindcss.com/docs/backdrop-blur

### App.tsx swap (AdminLayout → AppShell)

```tsx
// Before:
import AdminLayout from './components/AdminLayout';
// <AdminLayout /> in ProtectedRoute

// After:
import AppShell from './components/AppShell';
// <AppShell /> in ProtectedRoute

// Route children (Route index, assessments, etc.) are unchanged
```

---

## State of the Art

| Old Approach                          | Current Approach                     | When Changed     | Impact                                                        |
| ------------------------------------- | ------------------------------------ | ---------------- | ------------------------------------------------------------- |
| Horizontal tab nav in `<header>`      | Fixed left sidebar                   | Phase 3 (this)   | Standard admin app pattern; enables more nav items            |
| Full page sidebar always visible      | Desktop fixed + mobile Sheet         | 2020-2022 era    | Mobile-first; no horizontal scroll on small screens           |
| `activeClassName` prop on NavLink     | `className` function with `isActive` | React Router v6  | `activeClassName` was removed in v6; function prop is current |
| CSS Grid for sidebar layout           | Flexbox + `md:pl-64`                 | Ongoing          | Both valid; flexbox simpler for this use case                 |
| Manual `window.innerWidth` for mobile | Tailwind `hidden md:flex`            | Tailwind CSS era | No JS overhead; eliminates window resize event listeners      |

**Deprecated/outdated:**

- `activeClassName` prop on NavLink: Removed in React Router v6. Current code already uses the function form correctly.
- `position: absolute` sidebar with JavaScript overlay: The Sheet component handles this more correctly (focus trap, escape key, ARIA).

---

## Open Questions

1. **What exact purple tones to use for the body radial gradient (LAY-06)?**
   - What we know: REQUIREMENTS.md says "radial gradient from purple-dark tones"
   - What's unclear: Specific color values are not defined in requirements or prior research
   - Recommendation: Use `#2d1b69` (dark purple) to `#0f0a1e` (near-black purple) for the gradient stops. Planner should include this as a decision point or use these as defaults subject to visual review.

2. **Should the desktop sidebar have a mobile top header bar for branding/hamburger?**
   - What we know: LAY-04 specifies "header" — implying a top bar on mobile. LAY-02 says sidebar is hidden on mobile.
   - What's unclear: Whether the mobile top bar is a full sticky header or a minimal bar.
   - Recommendation: A minimal sticky mobile header with hamburger button and "MedEdPrep" wordmark. On desktop, the sidebar header contains the brand. This is the standard AppShell pattern.

3. **Does `ThemeToggle` from Phase 2 go in the sidebar header or the mobile top header?**
   - What we know: LAY-08 says "theme toggle embedded in the sidebar header" (from Phase description). THM-06 says toggle placed in admin sidebar header.
   - What's unclear: Phase 2 research placed the toggle in the existing horizontal `<header>` — which is being removed in Phase 3.
   - Recommendation: Move ThemeToggle to the sidebar header (inside `AdminSidebar` at the top). On mobile, the sidebar is in the Sheet — the toggle is accessible there. The mobile top bar shows only the hamburger and brand; the toggle is one tap away inside the Sheet.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection: `app/src/components/AdminLayout.tsx`, `app/src/App.tsx`, `app/src/lib/auth.ts`, `app/package.json`, `app/components.json`, `app/tsconfig.json`, `app/tailwind.config.js`, `app/src/index.css`
- `.planning/phases/02-theme-infrastructure/02-RESEARCH.md` — ThemeProvider/useTheme contract; `data-theme` attribute targeting; anti-patterns for CSS-vs-JS theming
- `.planning/REQUIREMENTS.md` — LAY-01 through LAY-08 full descriptions
- https://reactrouter.com/api/components/NavLink — `isActive`, `end` prop behavior (React Router v7)
- https://v3.tailwindcss.com/docs/backdrop-blur — Tailwind v3 backdrop-blur size values (confirmed 16px = `backdrop-blur-lg`)
- https://ui.shadcn.com/docs/components/sheet — Sheet subcomponents, `side` prop, installation command

### Secondary (MEDIUM confidence)

- WebSearch: shadcn Sheet component built on `@radix-ui/react-dialog` ^1.1.15 (already in project dependencies) — confirmed multiple sources
- WebSearch: `backdrop-filter` on a container breaks `position: fixed` child viewport positioning — confirmed by MDN and CSS-Tricks; HIGH confidence
- WebSearch: Drawer auto-close on navigation via `onClick` + optional `useLocation` effect — confirmed community pattern, matches Radix UI Dialog controlled pattern

### Tertiary (LOW confidence)

- Specific purple gradient values (`#2d1b69` to `#0f0a1e`) — derived from common glassmorphism palettes; not from official spec. Needs visual validation.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already installed except Sheet; Sheet adds zero new peer deps
- Architecture: HIGH — parallel desktop/mobile sidebar pattern is well-documented; `md:pl-64` AppShell is standard Tailwind; NavLink `isActive` is official API
- Pitfalls: HIGH — stacking context trap and NavLink `end` issues are verified against official CSS/browser specs; Sheet accessibility requirement verified against Radix docs
- Glass effects: MEDIUM — visual values (gradient colors, glow intensity) are educated estimates; need visual review during implementation

**Research date:** 2026-02-24
**Valid until:** 2026-03-31 (stable stack: React Router v7, shadcn/ui Sheet, Tailwind v3, lucide-react — no major breaking changes expected)
