import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ensureSuccess } from '../lib/api';
import type { BugReport, BugReportSubmission } from '../types/api';

interface BugReportsResponse {
  data: {
    reports: BugReport[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Submit a bug report (no auth required)
 */
export function useSubmitBugReport() {
  return useMutation({
    mutationFn: async (data: BugReportSubmission) =>
      ensureSuccess(
        await api.post<{
          id: string;
          category: string;
          severity: string;
          status: string;
          createdAt: string;
        }>('/api/bug-reports', data),
      ),
  });
}

/**
 * Get paginated list of bug reports (admin only)
 */
export function useBugReports(
  page = 1,
  limit = 20,
  status?: 'pending' | 'acknowledged' | 'resolved' | 'closed',
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.append('status', status);

  return useQuery({
    queryKey: ['bug-reports', page, limit, status],
    queryFn: async () =>
      ensureSuccess(await api.get<BugReportsResponse>(`/api/bug-reports?${params.toString()}`)),
  });
}

/**
 * Update bug report status (admin only)
 */
export function useUpdateBugReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: 'pending' | 'acknowledged' | 'resolved' | 'closed';
    }) => ensureSuccess(await api.patch<BugReport>(`/api/bug-reports/${id}`, { status })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
    },
  });
}
