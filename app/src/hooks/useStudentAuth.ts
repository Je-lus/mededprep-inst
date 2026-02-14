import { useMutation, useQuery } from '@tanstack/react-query';
import { api, ensureSuccess } from '../lib/api';
import { useStudentAuthStore, type StudentUser } from '../lib/student-auth';
import type { AssessmentReviewData, PaginatedResponse } from '../types/api';

export interface StudentAssessmentSummary {
  id: string;
  assessmentTitle: string;
  attempt?: number;
  scorePercentage?: string;
  passed?: boolean;
  completedAt?: string;
  resultsReleased: boolean;
}

export function useStudentLogin() {
  const login = useStudentAuthStore((s) => s.login);
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const result = ensureSuccess(await api.post<{ student: StudentUser }>('/api/student/login', data));
      login(result.student);
      return result;
    },
  });
}

export function useStudentRegister() {
  const login = useStudentAuthStore((s) => s.login);
  return useMutation({
    mutationFn: async (data: { email: string; password: string; firstName: string; lastName: string }) => {
      const result = ensureSuccess(await api.post<{ student: StudentUser }>('/api/student/register', data));
      login(result.student);
      return result;
    },
  });
}

export function useStudentAssessments(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['student-assessments', page, limit],
    queryFn: async () =>
      ensureSuccess(
        await api.get<PaginatedResponse<StudentAssessmentSummary>>(
          `/api/student/assessments?page=${page}&limit=${limit}`,
        ),
      ),
  });
}

export function useAssessmentReview(responseId: string) {
  return useQuery({
    queryKey: ['student-review', responseId],
    queryFn: async () => ensureSuccess(await api.get<AssessmentReviewData>(`/api/student/assessments/${responseId}/review`)),
    enabled: !!responseId,
  });
}
