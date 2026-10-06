import { create } from 'zustand';
import type { AuthState, AuthResponse, UserProfile } from '../types/auth';
import {
  SESSION_STORAGE_KEYS,
  clearSession,
  getStoredUser,
  getToken,
  isSessionExpired,
  resolveExpiry,
  saveSession,
  saveUser,
} from '../auth/session';

const readSession = (clearIfInvalid = true): { token: string | null; user: UserProfile | null } => {
  const token = getToken();
  const user = getStoredUser();

  if (token && user && !isSessionExpired()) {
    return { token, user };
  }

  if (clearIfInvalid) clearSession();
  return { token: null, user: null };
};

const initial = readSession();

export const useAuthStore = create<AuthState>((set) => ({
  user: initial.user,
  token: initial.token,
  isAuthenticated: !!initial.token,

  login: (data: AuthResponse) => {
    const userProfile: UserProfile = {
      userId: data.userId,
      username: data.username,
      email: data.email,
      role: data.role,
      authClient: data.authClient,
      isFirstLogin: data.isFirstLogin ?? false,
    };

    saveSession(data.accessToken, resolveExpiry(data), userProfile);

    set({
      token: data.accessToken,
      user: userProfile,
      isAuthenticated: true,
    });
  },

  updatePasswordRequirement: (isFirstLogin: boolean) => {
    set((state) => {
      if (!state.user) return state;

      const updatedUser: UserProfile = {
        ...state.user,
        isFirstLogin,
      };

      saveUser(updatedUser);

      return {
        ...state,
        user: updatedUser,
      };
    });
  },

  logout: () => {
    clearSession();
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

// Keep every open tab in sync: logging out (or in) in one tab applies to all.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && !Object.values(SESSION_STORAGE_KEYS).includes(event.key as never)) return;
    // Read-only here: another tab may be mid-way through writing its session.
    const next = readSession(false);
    useAuthStore.setState({ token: next.token, user: next.user, isAuthenticated: !!next.token });
  });
}
