/**
 * AuthContext Provider
 * Combines Zustand store with React Context for auth methods
 */

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../api/endpoints';
import type { LoginCredentials, SignupData, User } from '../api/types';
import { toast } from '../components/ui/use-toast';

// ============================================================================
// CONTEXT INTERFACE
// ============================================================================

interface AuthContextType {
  // State from Zustand
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Methods
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ============================================================================
// CREATE CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// AUTH PROVIDER COMPONENT
// ============================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  // Get state and actions from Zustand
  const { user, isAuthenticated, isLoading, setAuth, clearAuth, updateUser, setLoading } =
    useAuthStore();

  /**
   * Login user
   */
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        setLoading(true);

        const response = await authAPI.login(credentials);

        // Store auth data
        setAuth(response.access_token, response.user);

        // Show success message
        toast({
          title: 'Login successful',
          description: `Welcome back, ${response.user.full_name || response.user.username}!`,
        });

        // Navigate to dashboard
        navigate('/dashboard');
      } catch (error: any) {
        console.error('Login error:', error);

        // Show error message
        toast({
          title: 'Login failed',
          description: error.response?.data?.detail || 'Invalid username or password',
          variant: 'destructive',
        });

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, setLoading, navigate]
  );

  /**
   * Signup new user
   */
  const signup = useCallback(
    async (data: SignupData) => {
      try {
        setLoading(true);

        const response = await authAPI.signup(data);

        // Store auth data
        setAuth(response.access_token, response.user);

        // Show success message
        toast({
          title: 'Account created',
          description: `Welcome to SmartGrade Pro, ${response.user.full_name || response.user.username}!`,
        });

        // Navigate to dashboard
        navigate('/dashboard');
      } catch (error: any) {
        console.error('Signup error:', error);

        // Show error message
        toast({
          title: 'Signup failed',
          description: error.response?.data?.detail || 'Unable to create account',
          variant: 'destructive',
        });

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, setLoading, navigate]
  );

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      // Call backend logout endpoint (optional)
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call result
      clearAuth();

      // Show success message
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });

      // Navigate to login
      navigate('/login');
    }
  }, [clearAuth, navigate]);

  /**
   * Refresh user data from backend
   */
  const refreshUser = useCallback(async () => {
    try {
      if (!isAuthenticated) return;

      const user = await authAPI.getCurrentUser();
      updateUser(user);
    } catch (error) {
      console.error('Refresh user error:', error);

      // If 401, user will be logged out by axios interceptor
    }
  }, [isAuthenticated, updateUser]);

  /**
   * Check authentication on mount
   */
  useEffect(() => {
    if (isAuthenticated) {
      // Refresh user data to ensure it's up to date
      refreshUser();
    }
  }, []); // Only run on mount

  /**
   * Context value
   */
  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// USE AUTH HOOK
// ============================================================================

/**
 * Hook to access auth context
 * Must be used within AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

// ============================================================================
// EXPORT
// ============================================================================

export default AuthContext;
