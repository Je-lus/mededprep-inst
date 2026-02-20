import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api, ensureSuccess, ensurePaginatedSuccess } from '../lib/api';
import type { Student } from '../types/api';

export function useStudents(page = 1, limit = 25) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });

  return useQuery({
    queryKey: ['students', page, limit],
    queryFn: async () =>
      ensurePaginatedSuccess(await api.get<Student[]>(`/api/students?${params.toString()}`)),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      firstName?: string;
      lastName?: string;
      isActive?: boolean;
    }) => {
      const res = await api.patch<Student>(`/api/students/${id}`, data);
      return ensureSuccess(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useResetStudentPassword() {
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await api.patch<{ message: string }>(`/api/students/${id}/reset-password`, {
        password,
      });
      return ensureSuccess(res);
    },
  });
}
