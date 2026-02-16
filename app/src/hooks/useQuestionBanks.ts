import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ensureSuccess } from '../lib/api';
import type { QuestionBank, QuestionBankDetail, QuestionBankItem } from '../types/api';

export function useQuestionBanks() {
  return useQuery({
    queryKey: ['question-banks'],
    queryFn: async () => ensureSuccess(await api.get<QuestionBank[]>('/api/question-banks')),
  });
}

export function useQuestionBank(id: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: ['question-banks', id, page, limit],
    queryFn: async () =>
      ensureSuccess(
        await api.get<QuestionBankDetail>(`/api/question-banks/${id}?page=${page}&limit=${limit}`),
      ),
    enabled: !!id,
  });
}

export function useCreateQuestionBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; description?: string; subject?: string }) =>
      ensureSuccess(await api.post<QuestionBank>('/api/question-banks', data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['question-banks'] }),
  });
}

export function useUpdateQuestionBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      description?: string;
      subject?: string;
    }) => ensureSuccess(await api.put<QuestionBank>(`/api/question-banks/${id}`, data)),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['question-banks'] });
      qc.invalidateQueries({ queryKey: ['question-banks', vars.id] });
    },
  });
}

export function useDeleteQuestionBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      ensureSuccess(await api.delete<void>(`/api/question-banks/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['question-banks'] }),
  });
}

export function useAddBankItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bankId, questionData }: { bankId: string; questionData: unknown }) =>
      ensureSuccess(
        await api.post<QuestionBankItem>(`/api/question-banks/${bankId}/items`, { questionData }),
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['question-banks', vars.bankId] });
    },
  });
}

export function useUpdateBankItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bankId,
      itemId,
      questionData,
    }: {
      bankId: string;
      itemId: string;
      questionData: unknown;
    }) =>
      ensureSuccess(
        await api.put<QuestionBankItem>(`/api/question-banks/${bankId}/items/${itemId}`, {
          questionData,
        }),
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['question-banks', vars.bankId] });
    },
  });
}

export function useDeleteBankItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bankId, itemId }: { bankId: string; itemId: string }) =>
      ensureSuccess(await api.delete<void>(`/api/question-banks/${bankId}/items/${itemId}`)),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['question-banks', vars.bankId] });
    },
  });
}

export function useImportCsvToBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, csvContent }: { id: string; csvContent: string }) =>
      ensureSuccess(
        await api.post<{ questionCount: number }>(`/api/question-banks/${id}/import-csv`, {
          csvContent,
        }),
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['question-banks', vars.id] });
    },
  });
}

export function useIncrementItemUsage() {
  return useMutation({
    mutationFn: async ({ bankId, itemId }: { bankId: string; itemId: string }) =>
      ensureSuccess(
        await api.patch<void>(`/api/question-banks/${bankId}/items/${itemId}/increment-usage`),
      ),
  });
}
