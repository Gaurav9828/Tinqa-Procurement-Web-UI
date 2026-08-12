import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { UserRole } from '../config/permissions.config';

export interface UserSession {
  userId: number;
  username: string;
  email: string;
  role: UserRole;
  authClient: string;
  isFirstLogin?: boolean;
}

export interface AuthResponse extends UserSession {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (authData: AuthResponse) => void;
  logout: () => void;
  updateUserRole: (newRole: UserRole) => void;
}

const STORAGE_KEYS = {
  TOKEN: 'accessToken',
  USER: 'userSession',
} as const;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state from local storage on app startup
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as UserSession);
        }
      } catch (error) {
        console.error('Failed to parse authentication session from storage:', error);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Set user session and token on successful login
  const login = (authData: AuthResponse) => {
    const { accessToken, ...sessionData } = authData;

    setToken(accessToken);
    setUser(sessionData);

    localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(sessionData));
  };

  // Clear session state on logout
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };

  // Helper method to dynamically switch roles for testing/debugging
  const updateUserRole = (newRole: UserRole) => {
    if (!user) return;
    const updatedUser = { ...user, role: newRole };
    setUser(updatedUser);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    logout,
    updateUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom Hook to consume the AuthContext safely
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};