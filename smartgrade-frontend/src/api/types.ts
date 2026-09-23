/**
 * TypeScript Interfaces for SmartGrade Pro
 * Matches FastAPI backend models exactly
 */

// ============================================================================
// AUTH & USER TYPES
// ============================================================================

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  mobile_number?: string;
  role: 'teacher' | 'admin' | 'institution_admin' | 'faculty';
  institution_id?: number;
  school_name?: string;
  school_type?: string;
  created_at: string;
  groq_api_key?: string;
  mistral_api_key?: string;
  default_provider: 'Groq' | 'Mistral';
  default_model: string;
  default_strictness: 'Lenient' | 'Moderate' | 'Strict';
  grade_a_threshold: number;
  grade_b_threshold: number;
  grade_c_threshold: number;
  grade_d_threshold: number;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SignupData {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

// ============================================================================
// STUDENT TYPES
// ============================================================================

export interface Student {
  id: number;
  teacher_id: number;
  roll_number: string;
  full_name: string;
  email?: string;
  class_section?: string;
  created_at: string;
  is_active: boolean;
  evaluation_count?: number;
  average_score?: number;
}

export interface StudentCreate {
  roll_number: string;
  full_name: string;
  email?: string;
  class_section?: string;
}

export interface StudentListResponse {
  students: Student[];
}

// ============================================================================
// EVALUATION TYPES
// ============================================================================

export interface QuestionResult {
  question_number: number;
  question: string;
  max_marks: number;
  student_answer: string;
  earned: number;
  similarity_score: number;
  feedback: string;
  key_points_covered: string[];
  missing_points: string[];
  rubric?: {
    content_accuracy: number;
    clarity: number;
    examples: number;
    depth: number;
  };
}

export interface Evaluation {
  id: number;
  teacher_id: number;
  student_id?: number;
  student_name?: string;
  total_earned: number;
  total_max: number;
  percentage: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  grade_name: string;
  provider: string;
  model: string;
  strictness: string;
  partial_credit: boolean;
  used_reference: boolean;
  detailed_rubric: boolean;
  ai_confidence: number;
  overall_feedback: string;
  questions_results?: QuestionResult[];
  sheet_image_path?: string;
  status: string;
  created_at: string;
}

export interface EvaluationRequest {
  question_text?: string;
  answer_text?: string;
  question_file?: File;
  answer_file?: File;
  student_name?: string;
  provider: 'Groq' | 'Mistral';
  model: string;
  strictness: 'Lenient' | 'Moderate' | 'Strict';
  partial_credit: boolean;
  detailed_rubric: boolean;
  api_key: string;
}

export interface EvaluationResponse {
  id: number;
  total_earned: number;
  total_max: number;
  percentage: number;
  grade: string;
  grade_name: string;
  ai_confidence: number;
  overall_feedback: string;
  questions: QuestionResult[];
  created_at: string;
}

export interface EvaluationListResponse {
  evaluations: Evaluation[];
  total: number;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface GradeDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
  F: number;
}

export interface PerformanceTrend {
  date: string;
  average_score: number;
  count: number;
}

export interface RecentEvaluation {
  id: number;
  student_name?: string;
  grade: string;
  percentage: number;
  created_at: string;
  teacher_name?: string;
}

export interface AnalyticsData {
  total_evaluations: number;
  total_students: number;
  average_score: number;
  grade_distribution: any; 
  recent_evaluations: RecentEvaluation[];
  performance_trends: PerformanceTrend[];
  faculty_breakdown?: any[];
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

export interface APIKeysUpdate {
  groq_key?: string;
  mistral_key?: string;
  gemini_key?: string;
  openai_key?: string;
  anthropic_key?: string;
}

export interface PreferencesUpdate {
  default_provider?: 'Groq' | 'Mistral' | 'Gemini' | 'OpenAI' | 'Anthropic';
  default_model?: string;
  default_strictness?: 'Lenient' | 'Moderate' | 'Strict';
  grade_a?: number;
  grade_b?: number;
  grade_c?: number;
  grade_d?: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiError {
  detail: string;
}

export interface ApiSuccess {
  message: string;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface EvaluationFormData {
  questionText: string;
  answerText: string;
  questionFile?: File;
  answerFile?: File;
  studentName: string;
  provider: 'Groq' | 'Mistral';
  model: string;
  strictness: 'Lenient' | 'Moderate' | 'Strict';
  partialCredit: boolean;
  detailedRubric: boolean;
}

export interface StudentFormData {
  rollNumber: string;
  fullName: string;
  email?: string;
  classSection?: string;
}

// ============================================================================
// CHART DATA TYPES
// ============================================================================

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface LineChartDataPoint {
  date: string;
  score: number;
}

// ============================================================================
// TABLE TYPES (TanStack Table)
// ============================================================================

export interface StudentTableRow extends Student {
  actions?: React.ReactNode;
}

export interface EvaluationTableRow extends Evaluation {
  actions?: React.ReactNode;
}

// ============================================================================
// ROUTE TYPES
// ============================================================================

export type AppRoute = 
  | '/'
  | '/login'
  | '/signup'
  | '/dashboard'
  | '/evaluate'
  | '/students'
  | '/analytics'
  | '/history'
  | '/settings';

// ============================================================================
// THEME TYPES
// ============================================================================

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  theme: Theme;
  radius: number;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: 'default' | 'destructive' | 'success';
  duration?: number;
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export type {
  // Re-export for convenience
  User as UserType,
  Student as StudentType,
  Evaluation as EvaluationType,
};
