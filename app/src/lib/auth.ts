import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string;
}

export interface OrgInfo {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  org: OrgInfo | null;
  login: (user: User, org?: OrgInfo) => void;
  logout: () => void;
  setOrg: (org: OrgInfo) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      org: null,
      login: (user, org) => {
        set({ user, org: org || null });
      },
      logout: () => {
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => {});
        set({ user: null, org: null });
      },
      setOrg: (org) => set({ org }),
    }),
    { name: 'auth-storage' },
  ),
);

export const useIsAuthenticated = () => useAuthStore((s) => !!s.user);
