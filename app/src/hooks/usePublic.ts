import { useQuery, useMutation } from '@tanstack/react-query';
import { api, ensureSuccess } from '../lib/api';
import type { PublicAssessmentInfo, AssessmentSubmitResult } from '../types/api';

export function usePublicAssessment(hash: string) {
  return useQuery({
    queryKey: ['public-assessment', hash],
    queryFn: async () =>
      ensureSuccess(
        await api.get<PublicAssessmentInfo & { surveyJson: unknown }>(
          `/api/public/assessment/${hash}`,
        ),
      ),
    enabled: !!hash,
  });
}

export function useStartAssessment(hash: string) {
  return useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; studentEmail: string }) =>
      ensureSuccess(
        await api.post<{
          surveyJson: unknown;
          questionOrder: string[];
          responseId: string;
          responseData?: Record<string, unknown> | null;
          startedAt?: string | null;
        }>(`/api/public/assessment/${hash}/start`, data),
      ),
  });
}

export function useSubmitAssessment(hash: string) {
  return useMutation({
    mutationFn: async (data: {
      responseId: string;
      responseData: Record<string, unknown>;
      timeTaken?: number;
    }) =>
      ensureSuccess(
        await api.post<AssessmentSubmitResult>(`/api/public/assessment/${hash}/submit`, data),
      ),
  });
}
