import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StudentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  orgId: string;
  emailVerified?: boolean;
}

/** 4 hours in milliseconds — must match backend JWT_EXPIRY */
const SESSION_DURATION_MS = 4 * 60 * 60 * 1000;

interface StudentAuthState {
  student: StudentUser | null;
  sessionExpiresAt: number | null;
  login: (student: StudentUser) => void;
  logout: () => void;
  refreshSession: () => void;
  setEmailVerified: () => void;
}

export const useStudentAuthStore = create<StudentAuthState>()(
  persist(
    (set) => ({
      student: null,
      sessionExpiresAt: null,
      login: (student) => set({ student, sessionExpiresAt: Date.now() + SESSION_DURATION_MS }),
      logout: () => {
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/student/logout`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => {});
        set({ student: null, sessionExpiresAt: null });
      },
      refreshSession: () => set({ sessionExpiresAt: Date.now() + SESSION_DURATION_MS }),
      setEmailVerified: () =>
        set((state) => ({
          student: state.student ? { ...state.student, emailVerified: true } : null,
        })),
    }),
    { name: 'student-auth-storage' },
  ),
);

export const useIsStudentAuthenticated = () => useStudentAuthStore((s) => !!s.student);
