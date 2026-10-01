import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@/types';

const ACCESS_KEY = 'laundry.accessToken';
const REFRESH_KEY = 'laundry.refreshToken';
const USER_KEY = 'laundry.user';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setTokens: (access: string, refresh: string) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  login: (access: string, refresh: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

async function safeGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,

  hydrate: async () => {
    const [accessToken, refreshToken, userJson] = await Promise.all([
      safeGet(ACCESS_KEY),
      safeGet(REFRESH_KEY),
      safeGet(USER_KEY),
    ]);
    let user: User | null = null;
    if (userJson) {
      try {
        user = JSON.parse(userJson);
      } catch {
        user = null;
      }
    }
    set({ accessToken, refreshToken, user, hydrated: true });
  },

  setTokens: async (access, refresh) => {
    set({ accessToken: access, refreshToken: refresh });
    try {
      await SecureStore.setItemAsync(ACCESS_KEY, access);
      await SecureStore.setItemAsync(REFRESH_KEY, refresh);
    } catch {
      // ignore storage failures
    }
  },

  setUser: async (user) => {
    set({ user });
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch {
      // ignore storage failures
    }
  },

  login: async (access, refresh, user) => {
    set({ accessToken: access, refreshToken: refresh, user });
    try {
      await SecureStore.setItemAsync(ACCESS_KEY, access);
      await SecureStore.setItemAsync(REFRESH_KEY, refresh);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch {
      // ignore storage failures
    }
  },

  logout: async () => {
    set({ accessToken: null, refreshToken: null, user: null });
    try {
      await SecureStore.deleteItemAsync(ACCESS_KEY);
      await SecureStore.deleteItemAsync(REFRESH_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
      // ignore storage failures
    }
  },
}));
