import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api, ensureSuccess, ensurePaginatedSuccess } from '../lib/api';
import type {
  Assessment,
  AssessmentDetail,
  AssessmentResponse,
  ItemAnalysisResult,
  QrCodeData,
  ResponseDetail,
  SurveyJson,
} from '../types/api';

export function useAssessments() {
  return useQuery({
    queryKey: ['assessments'],
    queryFn: async () => ensureSuccess(await api.get<Assessment[]>('/api/assessments')),
  });
}

export function useAssessment(id: string) {
  return useQuery({
    queryKey: ['assessments', id],
    queryFn: async () => ensureSuccess(await api.get<AssessmentDetail>(`/api/assessments/${id}`)),
    enabled: !!id,
  });
}

export function useCreateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      surveyJson?: string;
      passingScore?: number;
      timeLimitMinutes?: number;
      randomizeQuestions?: boolean;
      randomizeChoices?: boolean;
      allowStudentReview?: boolean;
    }) => ensureSuccess(await api.post<Assessment>('/api/assessments', data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assessments'] }),
  });
}

export function useUpdateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      description?: string;
      surveyJson?: string;
      passingScore?: number;
      timeLimitMinutes?: number | null;
      resultsReleased?: boolean;
      showScoreFeedback?: boolean;
      allowStudentReview?: boolean;
      randomizeQuestions?: boolean;
      randomizeChoices?: boolean;
    }) => ensureSuccess(await api.put<Assessment>(`/api/assessments/${id}`, data)),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['assessments'] });
      qc.invalidateQueries({ queryKey: ['assessments', vars.id] });
    },
  });
}

export function useDeleteAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      ensureSuccess(await api.delete<void>(`/api/assessments/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assessments'] }),
  });
}

export function usePublishAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      ensureSuccess(await api.post<Assessment>(`/api/assessments/${id}/publish`)),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['assessments'] });
      qc.invalidateQueries({ queryKey: ['assessments', id] });
    },
  });
}

export function useCloseAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      ensureSuccess(await api.post<Assessment>(`/api/assessments/${id}/close`)),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['assessments'] });
      qc.invalidateQueries({ queryKey: ['assessments', id] });
    },
  });
}

export function useReactivateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      ensureSuccess(await api.post<Assessment>(`/api/assessments/${id}/reactivate`)),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['assessments'] });
      qc.invalidateQueries({ queryKey: ['assessments', id] });
    },
  });
}

export function useParseCsv() {
  return useMutation({
    mutationFn: async ({ csvContent }: { csvContent: string }) =>
      ensureSuccess(
        await api.post<{ surveyJson: SurveyJson; questionCount: number; warnings: string[] }>(
          '/api/assessments/parse-csv',
          { csvContent },
        ),
      ),
  });
}

export function useAssessmentQrCode(id: string) {
  return useQuery({
    queryKey: ['assessments', id, 'qr-code'],
    queryFn: async () => ensureSuccess(await api.get<QrCodeData>(`/api/assessments/${id}/qr-code`)),
    enabled: !!id,
  });
}

export function useAllAssessmentResponses(id: string, refetchInterval?: number) {
  return useQuery({
    queryKey: ['assessments', id, 'responses', 'all'],
    queryFn: async () =>
      ensurePaginatedSuccess(
        await api.get<AssessmentResponse[]>(`/api/assessments/${id}/responses?page=1&limit=200`),
      ),
    enabled: !!id,
    refetchInterval,
  });
}

export function useAssessmentResponses(id: string, page = 1, limit = 10, refetchInterval?: number) {
  return useQuery({
    queryKey: ['assessments', id, 'responses', page, limit],
    queryFn: async () =>
      ensurePaginatedSuccess(
        await api.get<AssessmentResponse[]>(
          `/api/assessments/${id}/responses?page=${page}&limit=${limit}`,
        ),
      ),
    enabled: !!id,
    refetchInterval,
    placeholderData: keepPreviousData,
  });
}

export function useResponseDetail(assessmentId: string, responseId: string) {
  return useQuery({
    queryKey: ['assessments', assessmentId, 'responses', responseId],
    queryFn: async () =>
      ensureSuccess(
        await api.get<ResponseDetail>(`/api/assessments/${assessmentId}/responses/${responseId}`),
      ),
    enabled: !!assessmentId && !!responseId,
  });
}

export function useItemAnalysis(id: string, refetchInterval?: number) {
  return useQuery({
    queryKey: ['assessments', id, 'item-analysis'],
    queryFn: async () =>
      ensureSuccess(await api.get<ItemAnalysisResult>(`/api/assessments/${id}/item-analysis`)),
    enabled: !!id,
    refetchInterval,
  });
}

export function useReleaseResults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, released }: { id: string; released: boolean }) =>
      ensureSuccess(
        await api.put<Assessment>(`/api/assessments/${id}/release-results`, { released }),
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['assessments', vars.id] });
    },
  });
}
