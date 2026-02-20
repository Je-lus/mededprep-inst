import { useMutation, useQuery, keepPreviousData } from '@tanstack/react-query';
import { api, ensureSuccess, ensurePaginatedSuccess } from '../lib/api';
import { useStudentAuthStore, type StudentUser } from '../lib/student-auth';
import type { AssessmentReviewData } from '../types/api';

export interface StudentAssessmentSummary {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  attempt?: number;
  scorePercentage?: string;
  passed?: boolean;
  completedAt?: string;
  resultsReleased: boolean;
}

export interface StudentStats {
  totalCompleted: number;
  averageScore: number;
  bestScore: number;
  passRate: number;
}

export interface PeerStats {
  classAverage: number | null;
  classMedian: number | null;
  totalResponses: number;
  percentile: number | null;
  scoreDistribution: { range: string; count: number }[] | null;
  insufficientData: boolean;
}

export interface ClassAverageEntry {
  classAverage: number;
  totalResponses: number;
}

export type ClassAveragesMap = Record<string, ClassAverageEntry | null>;

export function useStudentLogin() {
  const login = useStudentAuthStore((s) => s.login);
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const result = ensureSuccess(
        await api.post<{ student: StudentUser }>('/api/student/login', data),
      );
      login(result.student);
      return result;
    },
  });
}

export function useStudentRegister() {
  const login = useStudentAuthStore((s) => s.login);
  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => {
      const result = ensureSuccess(
        await api.post<{ student: StudentUser }>('/api/student/register', data),
      );
      login(result.student);
      return result;
    },
  });
}

export function useStudentAssessments(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['student-assessments', page, limit],
    queryFn: async () =>
      ensurePaginatedSuccess(
        await api.get<StudentAssessmentSummary[]>(
          `/api/student/assessments?page=${page}&limit=${limit}`,
        ),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useStudentStats() {
  return useQuery({
    queryKey: ['student-stats'],
    queryFn: async () => ensureSuccess(await api.get<StudentStats>('/api/student/stats')),
  });
}

export function useAssessmentReview(responseId: string) {
  return useQuery({
    queryKey: ['student-review', responseId],
    queryFn: async () =>
      ensureSuccess(
        await api.get<AssessmentReviewData>(`/api/student/assessments/${responseId}/review`),
      ),
    enabled: !!responseId,
  });
}

export function usePeerStats(assessmentId: string) {
  return useQuery({
    queryKey: ['peer-stats', assessmentId],
    queryFn: async () =>
      ensureSuccess(
        await api.get<PeerStats>(`/api/student/assessments/${assessmentId}/peer-stats`),
      ),
    enabled: !!assessmentId,
  });
}

export function usePeerStatsByResponse(responseId: string) {
  return useQuery({
    queryKey: ['peer-stats-response', responseId],
    queryFn: async () =>
      ensureSuccess(await api.get<PeerStats>(`/api/student/responses/${responseId}/peer-stats`)),
    enabled: !!responseId,
  });
}

export function useClassAverages(assessmentIds: string[]) {
  const ids = [...new Set(assessmentIds)].sort().join(',');
  return useQuery({
    queryKey: ['class-averages', ids],
    queryFn: async () =>
      ensureSuccess(
        await api.get<ClassAveragesMap>(
          `/api/student/assessments/class-averages?ids=${encodeURIComponent(ids)}`,
        ),
      ),
    enabled: assessmentIds.length > 0,
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (data: { email: string }) => {
      const result = ensureSuccess(
        await api.post<{ message: string; resetToken?: string }>(
          '/api/student/forgot-password',
          data,
        ),
      );
      return result;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const result = ensureSuccess(
        await api.post<{ message: string }>('/api/student/reset-password', data),
      );
      return result;
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (data: { token: string }) => {
      const result = ensureSuccess(
        await api.post<{ message: string }>('/api/student/verify-email', data),
      );
      return result;
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: async () => {
      const result = ensureSuccess(
        await api.post<{ message: string; verificationToken?: string }>(
          '/api/student/resend-verification',
        ),
      );
      return result;
    },
  });
}
