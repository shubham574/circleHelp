import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { ApiResponse } from '@nearhelp/shared';

const SERVER_URL_KEY = 'nearhelp_server_url';

// API URL resolved from Environment, Expo config, or localhost fallback
let currentApiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://localhost:3001';

export function getApiUrl(): string {
  return currentApiUrl;
}

export async function loadSavedServerUrl(): Promise<string> {
  try {
    const saved =
      Platform.OS === 'web'
        ? localStorage.getItem(SERVER_URL_KEY)
        : await SecureStore.getItemAsync(SERVER_URL_KEY);
    if (saved) {
      currentApiUrl = saved;
    }
  } catch {
    // Keep default
  }
  return currentApiUrl;
}

export async function setCustomServerUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/+$/, '');
  currentApiUrl = clean;
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(SERVER_URL_KEY, clean);
    } else {
      await SecureStore.setItemAsync(SERVER_URL_KEY, clean);
    }
  } catch {
    // ignore
  }
}

let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

export function getApiAuthToken(): string | null {
  return authToken;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    throw new ApiError(
      `Cannot connect to server at ${baseUrl}. Ensure your server is running and reachable from this device. (${msg})`,
      'NETWORK_ERROR',
      0
    );
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = (data as ApiResponse<unknown>)?.error;
    throw new ApiError(
      error?.message || `HTTP ${response.status}: ${response.statusText}`,
      error?.code || 'UNKNOWN_ERROR',
      response.status
    );
  }

  return (data as ApiResponse<T>)?.data as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
