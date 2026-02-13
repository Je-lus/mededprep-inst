const API_BASE = import.meta.env.VITE_API_URL || '';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
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

/** Extract field-level errors from an error (returns empty object if none). */
export function getFieldErrors(err: unknown): Record<string, string> {
  if (err instanceof ApiError && err.details) return err.details;
  return {};
}

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        window.location.href = '/login';
      }
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } };
    }

    return response.json();
  } catch {
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Unable to connect to server' },
    };
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
  delete: <T>(endpoint: string) => apiClient<T>(endpoint, { method: 'DELETE' }),
};
