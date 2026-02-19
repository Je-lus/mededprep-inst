import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ensureSuccess } from '../lib/api';
import type { Student } from '../types/api';

export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const res = await api.get<Student[]>('/api/students');
      return ensureSuccess(res);
    },
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
