/**
 * Axios Instance Configuration
 * Handles JWT tokens, request/response interceptors, and error handling
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// API Base URL from environment
// @ts-ignore
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 300 seconds / 5 minutes (AI evaluation can take time)
});

// ============================================================================
// REQUEST INTERCEPTOR (Add JWT Token)
// ============================================================================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token = localStorage.getItem('accessToken');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    // @ts-ignore
    if (import.meta.env.DEV) {
      console.log('🚀 API Request:', config.method?.toUpperCase(), config.url);
    }
    
    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// ============================================================================
// RESPONSE INTERCEPTOR (Handle Errors & 401)
// ============================================================================

api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    // @ts-ignore
    if (import.meta.env.DEV) {
      console.log('✅ API Response:', response.config.url, response.status);
    }
    return response;
  },
  (error: AxiosError) => {
    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      
      // 401 Unauthorized - Token expired or invalid
      if (status === 401) {
        // Clear Auth Store
        // @ts-ignore
        import('@/store/authStore').then(({ useAuthStore }) => {
            useAuthStore.getState().clearAuth();
        }).catch(() => {
            localStorage.removeItem('auth-storage');
        });
        
        // Redirect to login (only if not already on auth page)
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/signup')) {
          window.location.href = '/login';
        }
      }
      
      // 403 Forbidden
      if (status === 403) {
        console.error('🚫 Forbidden - Insufficient permissions');
        const detail = (error.response?.data as any)?.detail || '';
        if (detail.includes('removed') || detail.includes('deactivated') || detail.includes('disabled')) {
          // Clear Auth Store and redirect to login
          // @ts-ignore
          import('@/store/authStore').then(({ useAuthStore }) => {
            useAuthStore.getState().clearAuth();
          }).catch(() => {
            localStorage.removeItem('auth-storage');
          });
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login?revoked=1';
          }
        }
      }
      
      // 404 Not Found
      if (status === 404) {
        console.error('❓ Not Found:', error.config?.url);
      }
      
      // 422 Validation Error
      if (status === 422) {
        console.error('⚠️ Validation Error:', error.response.data);
      }
      
      // 500 Server Error
      if (status >= 500) {
        console.error('💥 Server Error:', error.response.data);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('📡 Network Error - No response from server');
    } else {
      // Something else happened
      console.error('❌ Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Set authentication token
 */
export const setAuthToken = (token: string) => {
  localStorage.setItem('accessToken', token);
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

/**
 * Clear authentication token
 */
export const clearAuthToken = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  delete api.defaults.headers.common['Authorization'];
};

/**
 * Get current auth token
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

// ============================================================================
// EXPORT
// ============================================================================

export default api;
