import axios, { AxiosError } from 'axios';
import type { ApiResponse } from '@/types';

const TOKEN_KEY = 'slms.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  withCredentials: false,
});

http.interceptors.request.use((config) => {
  const token = tokenStore.get();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * A 401 means the token is gone or expired. Clear it and bounce to the login
 * screen — but never redirect away from the login screen itself, otherwise a
 * failed sign-in would reload the page and swallow the error message.
 */
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      tokenStore.clear();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

/** A normalised error the UI can render directly. */
export interface ApiError {
  status: number;
  message: string;
  errors: Record<string, string[]>;
  /** Extra context from a business-rule violation (e.g. blocking reasons). */
  context: Record<string, unknown>;
}

export function toApiError(error: unknown): ApiError {
  const axiosError = error as AxiosError<ApiResponse<unknown> & Record<string, unknown>>;
  const payload = axiosError.response?.data;

  if (payload) {
    const errors = (payload.errors ?? {}) as Record<string, unknown>;

    // The API puts field errors and business-rule context in the same slot;
    // split them so forms only ever see string[] values.
    const fieldErrors: Record<string, string[]> = {};
    const context: Record<string, unknown> = {};

    Object.entries(errors).forEach(([key, value]) => {
      if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
        fieldErrors[key] = value as string[];
      } else {
        context[key] = value;
      }
    });

    return {
      status: axiosError.response?.status ?? 500,
      message: payload.message ?? 'Something went wrong.',
      errors: fieldErrors,
      context,
    };
  }

  if (axiosError.code === 'ERR_NETWORK') {
    return {
      status: 0,
      message:
        'Cannot reach the library server. Check that the API is running and try again.',
      errors: {},
      context: {},
    };
  }

  return {
    status: 500,
    message: axiosError.message || 'An unexpected error occurred.',
    errors: {},
    context: {},
  };
}

/** Unwraps the API envelope and returns just `data`. */
export async function request<T>(
  promise: Promise<{ data: ApiResponse<T> }>,
): Promise<T> {
  const response = await promise;
  return response.data.data;
}

/** Unwraps the envelope but keeps `meta` (used by paginated lists). */
export async function requestWithMeta<T>(
  promise: Promise<{ data: ApiResponse<T> }>,
): Promise<{ data: T; meta?: ApiResponse<T>['meta']; message: string | null }> {
  const response = await promise;
  return {
    data: response.data.data,
    meta: response.data.meta,
    message: response.data.message,
  };
}
