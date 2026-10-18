import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { api, setApiAuthToken, ApiError } from '../lib/api';
import type { UserProfile } from '@nearhelp/shared';

const TOKEN_KEY = 'nearhelp_auth_token';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  login: (token: string) => Promise<void>;
  register: (token: string, displayName: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  updateUser: (data: Partial<UserProfile>) => void;
  clearError: () => void;
}

async function saveToken(token: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function deleteStoredToken() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      setApiAuthToken(token);
      await saveToken(token);

      // Fetch user profile from /users/me
      const data = await api.get<{ user: UserProfile }>('/users/me');
      set({
        token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      setApiAuthToken(null);
      await deleteStoredToken();
      const message = err instanceof ApiError ? err.message : 'Login failed';
      set({ error: message, isLoading: false, isAuthenticated: false });
      throw err;
    }
  },

  register: async (token: string, displayName: string, phone?: string) => {
    set({ isLoading: true, error: null });
    try {
      setApiAuthToken(token);
      await saveToken(token);

      const data = await api.post<{ user: UserProfile }>('/auth/register', {
        displayName,
        phone,
      });

      set({
        token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      setApiAuthToken(null);
      await deleteStoredToken();
      const message = err instanceof ApiError ? err.message : 'Registration failed';
      set({ error: message, isLoading: false, isAuthenticated: false });
      throw err;
    }
  },

  logout: async () => {
    setApiAuthToken(null);
    await deleteStoredToken();
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  loadSession: async () => {
    set({ isLoading: true });
    try {
      const storedToken = await getStoredToken();
      if (!storedToken) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      setApiAuthToken(storedToken);
      const data = await api.get<{ user: UserProfile }>('/users/me');
      set({
        token: storedToken,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      // If token expired or invalid, reset
      setApiAuthToken(null);
      await deleteStoredToken();
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  updateUser: (data: Partial<UserProfile>) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...data } });
    }
  },
}));
