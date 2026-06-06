import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Role = 'MANAGEMENT_ADMIN' | 'SENIOR_MANAGER' | 'HR_RECRUITER' | 'EMPLOYEE';

export interface AuthUser {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  position: string;
  department?: { id: string; name: string } | null;
  profileImage?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'hrms-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
