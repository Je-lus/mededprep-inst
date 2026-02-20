import { toast } from 'sonner';
import type { Pagination } from '../types/api';

const API_BASE = import.meta.env.VITE_API_URL || '';
const REQUEST_TIMEOUT_MS = 30_000;

/** Prevents multiple concurrent 401 responses from each triggering a redirect. */
let isRedirecting = false;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  pagination?: Pagination;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

export class ApiError extends Error {
  code: string;
  details?: Record<string, string>;

  constructor(error: { code: string; message: string; details?: Record<string, string> }) {
    super(error.message);
    this.name = 'ApiError';
    this.code = error.code;
    this.details = error.details;
  }
}

/** Throw ApiError if response is not successful; otherwise return data. */
export function ensureSuccess<T>(res: ApiResponse<T>, fallback = 'Request failed'): T {
  if (!res.success) throw new ApiError(res.error || { code: 'UNKNOWN', message: fallback });
  return res.data!;
}

/** Throw ApiError if response is not successful; otherwise return data + pagination. */
export function ensurePaginatedSuccess<T>(
  res: ApiResponse<T>,
  fallback = 'Request failed',
): { data: T; pagination: Pagination } {
  if (!res.success) throw new ApiError(res.error || { code: 'UNKNOWN', message: fallback });
  return { data: res.data!, pagination: res.pagination! };
}

/** Extract field-level errors from an error (returns empty object if none). */
export function getFieldErrors(err: unknown): Record<string, string> {
  if (err instanceof ApiError && err.details) return err.details;
  return {};
}

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      if (
        !isRedirecting &&
        !endpoint.includes('/auth/login') &&
        !endpoint.includes('/auth/refresh') &&
        !endpoint.includes('/student/refresh')
      ) {
        isRedirecting = true;
        toast.error('Your session has expired. Please sign in again.');
        const isStudentPath = window.location.pathname.startsWith('/student');
        window.location.href = isStudentPath ? '/student/login' : '/login';
      }
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } };
    }

    return response.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        success: false,
        error: { code: 'TIMEOUT', message: 'Request timed out' },
      };
    }
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Unable to connect to server' },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  get: <T>(endpoint: string) => apiClient<T>(endpoint),
  post: <T>(endpoint: string, data?: unknown) =>
    apiClient<T>(endpoint, {
      method: 'POST',
      ...(data !== undefined && { body: JSON.stringify(data) }),
    }),
  put: <T>(endpoint: string, data?: unknown) =>
    apiClient<T>(endpoint, {
      method: 'PUT',
      ...(data !== undefined && { body: JSON.stringify(data) }),
    }),
  patch: <T>(endpoint: string, data?: unknown) =>
    apiClient<T>(endpoint, {
      method: 'PATCH',
      ...(data !== undefined && { body: JSON.stringify(data) }),
    }),
  delete: <T>(endpoint: string) => apiClient<T>(endpoint, { method: 'DELETE' }),
};
