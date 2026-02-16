# Task 2: Admin Layout with Persistent Navigation

> Read AGENTS.md first for project context, then implement the task below.
> After completing, verify your work compiles and passes lint.

---

Context: MedEdPrep Instructor Tools — React 19, React Router, shadcn/ui, Tailwind. Brand color: #1b5fd0.

Problem: There is no shared layout for admin pages. Each page renders its own header with brand name, user email, and sign-out button. There's no way to navigate between pages without the browser back button. This needs a persistent top navigation bar.

Current State:
- `app/src/App.tsx` — Each admin route individually wraps its component with `<ProtectedRoute>`. ProtectedRoute is defined inline (lines 16-20) using `useIsAuthenticated()`. There is also a `StudentProtectedRoute` (lines 22-26).
- `app/src/pages/Dashboard.tsx` — Has its own `<header>` block with brand "MedEdPrep", user email, and sign out button. Outer wrapper: `<div className="min-h-screen bg-gray-50">`.
- `app/src/pages/admin/AssessmentList.tsx` — Outer wrapper: `<div className="min-h-screen bg-gray-50">` with `<main>` inside.
- `app/src/pages/admin/AssessmentCreate.tsx` — Same `min-h-screen bg-gray-50` pattern.
- `app/src/pages/admin/AssessmentDetail.tsx` — Same pattern. Has its own page title area.

Changes Required:

1. Create `app/src/components/AdminLayout.tsx`:
   - Import `Outlet` from react-router-dom, `useAuthStore` from `@/lib/auth`, `NavLink` from react-router-dom
   - Sticky header with: "MedEdPrep" brand text (left), user email + "Sign Out" button (right)
   - Below header: horizontal tab nav with NavLink items — "Dashboard" (to "/") and "Assessments" (to "/assessments")
   - Use NavLink's active state for styling: active tab gets brand color text + bottom border, inactive gets muted text
   - Below nav: `<main className="mx-auto max-w-7xl px-6 py-8"><Outlet /></main>`
   - The layout provides `min-h-screen bg-gray-50` — child pages should NOT provide it

2. Restructure `app/src/App.tsx`:
   - Keep ProtectedRoute and StudentProtectedRoute inline definitions
   - Wrap admin routes in a layout route: `<Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>`
   - Child routes: `<Route index element={<Dashboard />} />`, `<Route path="assessments" element={<AssessmentList />} />`, etc.
   - `/login` stays outside the layout
   - Public and student routes stay unchanged
   - QrPresenter (`/assessments/:id/present`) should also be inside the layout

3. Strip standalone wrappers from admin pages:
   - Dashboard.tsx: Remove the `<header>` block, remove the outer `<div className="min-h-screen bg-gray-50">` wrapper, remove the `<main>` wrapper. The component should just return its content cards.
   - AssessmentList.tsx: Remove outer `min-h-screen bg-gray-50` div and `<main>` wrapper.
   - AssessmentCreate.tsx: Same — remove outer wrappers.
   - AssessmentDetail.tsx: Same — remove outer wrappers.

What NOT to Do:
- Do not add a sidebar — this is a horizontal top nav only
- Do not modify student routes or public routes
- Do not add dropdown menus or user profile pages
- Do not touch any tab content components (OverviewTab, ResponsesTab, etc.)

Acceptance Criteria:
- [ ] AdminLayout renders header with brand, user email, sign out
- [ ] Tab nav shows "Dashboard" and "Assessments" with active state styling
- [ ] All admin pages render inside the layout with persistent nav
- [ ] No admin page has its own header/sign-out/bg-gray-50 wrapper anymore
- [ ] Login page is NOT inside the layout
- [ ] Student and public routes are unaffected
- [ ] `cd app && npx tsc --noEmit` passes

Verification:
cd app && npx tsc --noEmit
cd app && npx vite build
