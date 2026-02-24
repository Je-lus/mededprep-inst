import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth';
import ThemeToggle from '@/components/ThemeToggle';

interface AdminSidebarProps {
  onNavigate?: () => void;
}

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/assessments', label: 'Assessments', end: false },
  { to: '/question-banks', label: 'Question Banks', end: false },
  { to: '/sessions', label: 'Attendance', end: false },
  { to: '/students', label: 'Students', end: false },
  { to: '/bug-reports', label: 'Bug Reports', end: false },
] as const;

export default function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex h-full flex-col">
      {/* Sidebar header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-4">
        <span className="text-lg font-semibold text-foreground">MedEdPrep</span>
        <ThemeToggle />
      </div>

      {/* Nav section */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => onNavigate?.()}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
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
            onClick={() => onNavigate?.()}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
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

      {/* Footer section */}
      <div className="border-t border-border/50 px-4 py-3">
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
