import { create } from 'zustand';
import type { AuthState, AuthResponse, UserProfile } from '../types/auth';

const getInitialAuth = (): { token: string | null; user: UserProfile | null } => {
  const token = localStorage.getItem('token');
  const expiry = localStorage.getItem('tokenExpiry');
  const userStr = localStorage.getItem('user');

  if (token && expiry && Date.now() < Number(expiry) && userStr) {
    try {
      return { token, user: JSON.parse(userStr) };
    } catch {
      localStorage.clear();
    }
  } else {
    localStorage.clear();
  }

  return { token: null, user: null };
};

const initial = getInitialAuth();

export const useAuthStore = create<AuthState>((set) => ({
  user: initial.user,
  token: initial.token,
  isAuthenticated: !!initial.token,

  login: (data: AuthResponse) => {
    const expiryTimestamp = Date.now() + data.expiresIn;

    const userProfile: UserProfile = {
      userId: data.userId,
      username: data.username,
      email: data.email,
      role: data.role,
      authClient: data.authClient,
      isFirstLogin: data.isFirstLogin ?? false,
    };

    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('tokenExpiry', expiryTimestamp.toString());
    localStorage.setItem('user', JSON.stringify(userProfile));

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

      localStorage.setItem('user', JSON.stringify(updatedUser));

      return {
        ...state,
        user: updatedUser,
      };
    });
  },

  logout: () => {
    localStorage.clear();
    set({ token: null, user: null, isAuthenticated: false });
  },
}));