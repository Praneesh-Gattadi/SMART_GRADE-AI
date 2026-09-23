/**
 * Zustand Auth Store
 * Lightweight global state for authentication
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../api/types';
import { setAuthToken, clearAuthToken } from '../api/axios';

// ============================================================================
// AUTH STORE INTERFACE
// ============================================================================

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

// ============================================================================
// CREATE AUTH STORE
// ============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Set authentication (login/signup)
      setAuth: (token: string, user: User) => {
        setAuthToken(token);
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      // Clear authentication (logout)
      clearAuth: () => {
        clearAuthToken();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      // Update user info (after settings change)
      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...updates };
          set({ user: updatedUser });
        }
      },

      // Set loading state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist user and token, not loading state
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook to check if user is authenticated
 */
export const useIsAuthenticated = () => {
  return useAuthStore((state) => state.isAuthenticated);
};

/**
 * Hook to get current user
 */
export const useCurrentUser = () => {
  return useAuthStore((state) => state.user);
};

/**
 * Hook to get auth loading state
 */
export const useAuthLoading = () => {
  return useAuthStore((state) => state.isLoading);
};
