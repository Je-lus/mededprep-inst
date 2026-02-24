import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">MedEdPrep</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
        <nav className="px-6 flex gap-6 border-t">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive
                ? 'py-3 border-b-2 border-primary text-primary font-medium'
                : 'py-3 text-muted-foreground hover:text-foreground'
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/assessments"
            className={({ isActive }) =>
              isActive
                ? 'py-3 border-b-2 border-primary text-primary font-medium'
                : 'py-3 text-muted-foreground hover:text-foreground'
            }
          >
            Assessments
          </NavLink>
          <NavLink
            to="/question-banks"
            className={({ isActive }) =>
              isActive
                ? 'py-3 border-b-2 border-primary text-primary font-medium'
                : 'py-3 text-muted-foreground hover:text-foreground'
            }
          >
            Question Banks
          </NavLink>
          <NavLink
            to="/sessions"
            className={({ isActive }) =>
              isActive
                ? 'py-3 border-b-2 border-primary text-primary font-medium'
                : 'py-3 text-muted-foreground hover:text-foreground'
            }
          >
            Attendance
          </NavLink>
          <NavLink
            to="/bug-reports"
            className={({ isActive }) =>
              isActive
                ? 'py-3 border-b-2 border-primary text-primary font-medium'
                : 'py-3 text-muted-foreground hover:text-foreground'
            }
          >
            Bug Reports
          </NavLink>
          <NavLink
            to="/students"
            className={({ isActive }) =>
              isActive
                ? 'py-3 border-b-2 border-primary text-primary font-medium'
                : 'py-3 text-muted-foreground hover:text-foreground'
            }
          >
            Students
          </NavLink>
          {user?.role === 'owner' && (
            <NavLink
              to="/instructors"
              className={({ isActive }) =>
                isActive
                  ? 'py-3 border-b-2 border-primary text-primary font-medium'
                  : 'py-3 text-muted-foreground hover:text-foreground'
              }
            >
              Instructors
            </NavLink>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
