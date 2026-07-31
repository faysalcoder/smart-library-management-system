import { create } from 'zustand';
import { http, request, tokenStore } from '@/lib/api';
import type { PublicSettings, RoleName, User } from '@/types';

export interface RegisterPayload {
  full_name: string;
  email: string;
  phone?: string;
  department: string;
  password: string;
  password_confirmation: string;
}

interface AuthState {
  user: User | null;
  settings: PublicSettings | null;
  /** True until the initial /auth/me rehydration finishes. */
  loading: boolean;

  login: (username: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  loadSettings: () => Promise<void>;

  can: (permission: string) => boolean;
  hasRole: (...roles: RoleName[]) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  settings: null,
  loading: true,

  async login(username, password) {
    const result = await request<{ user: User; token: string }>(
      http.post('/auth/login', { username, password }),
    );

    tokenStore.set(result.token);
    set({ user: result.user });

    await get().loadSettings();

    return result.user;
  },

  async register(payload) {
    const result = await request<{ user: User; token: string }>(
      http.post('/auth/register', payload),
    );

    tokenStore.set(result.token);
    set({ user: result.user });

    await get().loadSettings();

    return result.user;
  },

  async logout() {
    try {
      await http.post('/auth/logout');
    } catch {
      // A failed logout call must not trap the user in the app.
    }

    tokenStore.clear();
    set({ user: null, settings: null });
  },

  /** Rehydrates the session on page load / refresh. */
  async restore() {
    if (!tokenStore.get()) {
      set({ loading: false });
      return;
    }

    try {
      const user = await request<User>(http.get('/auth/me'));
      set({ user });
      await get().loadSettings();
    } catch {
      tokenStore.clear();
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  async loadSettings() {
    try {
      const settings = await request<PublicSettings>(http.get('/settings/public'));
      set({ settings });
    } catch {
      // Non-fatal: the UI falls back to sensible defaults in format helpers.
    }
  },

  can(permission) {
    return get().user?.permissions?.includes(permission) ?? false;
  },

  hasRole(...roles) {
    const name = get().user?.role?.name;
    return name ? roles.includes(name) : false;
  },
}));
