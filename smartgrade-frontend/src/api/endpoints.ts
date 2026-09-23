/**
 * API Endpoints
 * All backend API calls organized by feature
 */

import api from './axios';
import type {
  AuthTokens,
  LoginCredentials,
  SignupData,
  User,
  Student,
  StudentCreate,
  StudentListResponse,
  EvaluationResponse,
  EvaluationListResponse,
  AnalyticsData,
  APIKeysUpdate,
  PreferencesUpdate,
  ApiSuccess,
} from './types';

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

export const authAPI = {
  /**
   * User signup
   */
  signup: async (data: SignupData): Promise<AuthTokens> => {
    const response = await api.post<AuthTokens>('/auth/signup', data);
    return response.data;
  },

  /**
   * User login
   */
  login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
    // FastAPI expects form data for OAuth2
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await api.post<AuthTokens>('/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Get current user info
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  /**
   * Logout (client-side token removal)
   */
  logout: async (): Promise<ApiSuccess> => {
    const response = await api.post<ApiSuccess>('/auth/logout');
    return response.data;
  },
};

// ============================================================================
// EVALUATION ENDPOINTS
// ============================================================================

export const evaluationAPI = {
  /**
   * Create new evaluation
   */
  create: async (data: FormData): Promise<EvaluationResponse> => {
    const response = await api.post<EvaluationResponse>('/evaluate', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for AI processing
    });
    return response.data;
  },

  /**
   * Get all evaluations
   */
  getAll: async (skip = 0, limit = 50): Promise<EvaluationListResponse> => {
    const response = await api.get<EvaluationListResponse>('/evaluations', {
      params: { skip, limit },
    });
    return response.data;
  },

  /**
   * Get single evaluation by ID
   */
  getById: async (id: number): Promise<EvaluationResponse> => {
    const response = await api.get<EvaluationResponse>(`/evaluations/${id}`);
    return response.data;
  },

  /**
   * Download PDF report
   */
  downloadPDF: async (id: number): Promise<Blob> => {
    const response = await api.get(`/evaluations/${id}/download/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Download Excel report
   */
  downloadExcel: async (id: number): Promise<Blob> => {
    const response = await api.get(`/evaluations/${id}/download/excel`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Update evaluation manually
   */
  update: async (id: number, data: any): Promise<EvaluationResponse> => {
    const response = await api.put<EvaluationResponse>(`/evaluations/${id}`, data);
    return response.data;
  },
};

// ============================================================================
// STUDENT ENDPOINTS
// ============================================================================

export const studentAPI = {
  /**
   * Get all students
   */
  getAll: async (): Promise<StudentListResponse> => {
    const response = await api.get<StudentListResponse>('/students');
    return response.data;
  },

  /**
   * Create new student
   */
  create: async (data: StudentCreate): Promise<Student> => {
    const response = await api.post<Student>('/students', data);
    return response.data;
  },

  /**
   * Delete student (soft delete)
   */
  delete: async (id: number): Promise<ApiSuccess> => {
    const response = await api.delete<ApiSuccess>(`/students/${id}`);
    return response.data;
  },

  /**
   * Update student details
   */
  update: async (id: number, data: any): Promise<Student> => {
    const response = await api.put<Student>(`/students/${id}`, data);
    return response.data;
  },

  /**
   * Trigger alert/email to student
   */
  sendAlert: async (id: number): Promise<ApiSuccess> => {
    const response = await api.post<ApiSuccess>(`/students/${id}/alert`);
    return response.data;
  },
};

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

export const analyticsAPI = {
  /**
   * Get analytics data
   */
  get: async (days = 30): Promise<AnalyticsData> => {
    const response = await api.get<AnalyticsData>('/analytics', {
      params: { days },
    });
    return response.data;
  },
};

// ============================================================================
// SETTINGS ENDPOINTS
// ============================================================================

export const settingsAPI = {
  /**
   * Update API keys
   */
  updateAPIKeys: async (data: APIKeysUpdate): Promise<ApiSuccess> => {
    const response = await api.put<ApiSuccess>('/settings/api-keys', data);
    return response.data;
  },

  /**
   * Update user preferences
   */
  updatePreferences: async (data: PreferencesUpdate): Promise<ApiSuccess> => {
    const response = await api.put<ApiSuccess>('/settings/preferences', data);
    return response.data;
  },
};

// ============================================================================
// HEALTH CHECK
// ============================================================================

export const healthAPI = {
  /**
   * Check API health
   */
  check: async (): Promise<{ status: string; version: string; timestamp: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create evaluation FormData from form inputs
 */
export const createEvaluationFormData = (data: {
  questionText?: string;
  answerText?: string;
  questionFile?: File;
  answerFile?: File;
  studentName?: string;
  provider: string;
  model: string;
  strictness: string;
  partialCredit: boolean;
  detailedRubric: boolean;
  apiKey: string;
}): FormData => {
  const formData = new FormData();

  // Add text fields
  if (data.questionText) formData.append('question_text', data.questionText);
  if (data.answerText) formData.append('answer_text', data.answerText);
  if (data.studentName) formData.append('student_name', data.studentName);
  
  // Add files
  if (data.questionFile) formData.append('question_file', data.questionFile);
  if (data.answerFile) formData.append('answer_file', data.answerFile);
  
  // Add settings
  formData.append('provider', data.provider);
  formData.append('model', data.model);
  formData.append('strictness', data.strictness);
  formData.append('partial_credit', String(data.partialCredit));
  formData.append('detailed_rubric', String(data.detailedRubric));
  formData.append('api_key', data.apiKey);

  return formData;
};

/**
 * Download file from blob
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  auth: authAPI,
  evaluation: evaluationAPI,
  student: studentAPI,
  analytics: analyticsAPI,
  settings: settingsAPI,
  health: healthAPI,
};

