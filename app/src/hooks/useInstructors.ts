import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ensureSuccess } from '../lib/api';
import type { Instructor } from '../types/api';

export function useInstructors() {
  return useQuery({
    queryKey: ['instructors'],
    queryFn: async () => {
      const res = await api.get<Instructor[]>('/api/instructors');
      return ensureSuccess(res);
    },
  });
}

export function useCreateInstructor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      email: string;
      name: string;
      password: string;
      role?: string;
    }) => {
      const res = await api.post<Instructor>('/api/instructors', data);
      return ensureSuccess(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructors'] });
    },
  });
}

export function useUpdateInstructor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      email?: string;
      role?: string;
      isActive?: boolean;
    }) => {
      const res = await api.patch<Instructor>(`/api/instructors/${id}`, data);
      return ensureSuccess(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructors'] });
    },
  });
}

export function useDeactivateInstructor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/instructors/${id}`);
      return ensureSuccess(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructors'] });
    },
  });
}
