import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StudentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  orgId: string;
}

interface StudentAuthState {
  student: StudentUser | null;
  login: (student: StudentUser) => void;
  logout: () => void;
}

export const useStudentAuthStore = create<StudentAuthState>()(
  persist(
    (set) => ({
      student: null,
      login: (student) => set({ student }),
      logout: () => {
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/student/logout`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => {});
        set({ student: null });
      },
    }),
    { name: 'student-auth-storage' },
  ),
);

export const useIsStudentAuthenticated = () => useStudentAuthStore((s) => !!s.student);
