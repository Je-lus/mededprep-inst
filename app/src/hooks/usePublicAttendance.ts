import { useQuery, useMutation } from '@tanstack/react-query';
import { api, ensureSuccess } from '../lib/api';
import type {
  PublicSessionInfo,
  AttendeeRegistrationResult,
  StudentLookupResult,
  CheckOutResult,
} from '../types/api';

export function useSessionInfo(hash: string) {
  return useQuery({
    queryKey: ['public-session', hash],
    queryFn: async () => {
      const res = await api.get<PublicSessionInfo>(`/api/public/attend/${hash}`);
      return ensureSuccess(res);
    },
    enabled: !!hash,
  });
}

export function useRegisterAttendee(hash: string) {
  return useMutation({
    mutationFn: async (data: {
      email: string;
      firstName: string;
      lastName: string;
    }) => {
      const res = await api.post<AttendeeRegistrationResult>(
        `/api/public/attend/${hash}/register`,
        data
      );
      return ensureSuccess(res);
    },
  });
}

export function useLookupStudent(hash: string) {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await api.post<StudentLookupResult>(`/api/public/attend/${hash}/lookup`, {
        email,
      });
      return ensureSuccess(res);
    },
  });
}

export function useCheckOutSelf(hash: string) {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await api.post<CheckOutResult>(`/api/public/attend/${hash}/checkout`, {
        email,
      });
      return ensureSuccess(res);
    },
  });
}
