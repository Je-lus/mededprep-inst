import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ensureSuccess } from '../lib/api';
import type { Session, SessionDetail, SessionAttendee, SessionQrCodes } from '../types/api';

// ============================================
// SESSION CRUD HOOKS
// ============================================

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await api.get<Session[]>('/api/sessions');
      return ensureSuccess(res);
    },
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const res = await api.get<SessionDetail>(`/api/sessions/${id}`);
      return ensureSuccess(res);
    },
    enabled: !!id,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      startDateTime?: string;
      endDateTime?: string;
    }) => {
      const res = await api.post<Session>('/api/sessions', data);
      return ensureSuccess(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string;
      startDateTime?: string;
      endDateTime?: string;
    }) => {
      const res = await api.put<Session>(`/api/sessions/${id}`, data);
      return ensureSuccess(res);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['session', vars.id] });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/sessions/${id}`);
      return ensureSuccess(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function usePublishSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<Session>(`/api/sessions/${id}/publish`);
      return ensureSuccess(res);
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['session', id] });
    },
  });
}

// ============================================
// ATTENDEE MANAGEMENT HOOKS
// ============================================

export function useAddAttendee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, studentId }: { sessionId: string; studentId: string }) => {
      const res = await api.post<SessionAttendee>(`/api/sessions/${sessionId}/attendees`, {
        studentId,
      });
      return ensureSuccess(res);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['session', vars.sessionId] });
    },
  });
}

export function useUpdateAttendee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      attendeeId,
      ...data
    }: {
      sessionId: string;
      attendeeId: string;
      status?: string;
      notes?: string;
    }) => {
      const res = await api.put<SessionAttendee>(
        `/api/sessions/${sessionId}/attendees/${attendeeId}`,
        data,
      );
      return ensureSuccess(res);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['session', vars.sessionId] });
    },
  });
}

export function useCheckInAttendee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, attendeeId }: { sessionId: string; attendeeId: string }) => {
      const res = await api.post<SessionAttendee>(
        `/api/sessions/${sessionId}/attendees/${attendeeId}/check-in`,
      );
      return ensureSuccess(res);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['session', vars.sessionId] });
    },
  });
}

export function useCheckOutAttendee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, attendeeId }: { sessionId: string; attendeeId: string }) => {
      const res = await api.post<SessionAttendee>(
        `/api/sessions/${sessionId}/attendees/${attendeeId}/check-out`,
      );
      return ensureSuccess(res);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['session', vars.sessionId] });
    },
  });
}

export function useSessionQrCodes(sessionId: string) {
  return useQuery({
    queryKey: ['session-qr-codes', sessionId],
    queryFn: async () => {
      const res = await api.get<SessionQrCodes>(`/api/sessions/${sessionId}/qr-codes`);
      return ensureSuccess(res);
    },
    enabled: !!sessionId,
  });
}
