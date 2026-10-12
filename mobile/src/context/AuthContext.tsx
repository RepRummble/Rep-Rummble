import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';
import { User, AuthState, LoginCredentials, RegisterCredentials } from '../types';
import { DEV_BYPASS_AUTH, DEV_DUMMY_USER } from '../config/devConfig';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  /** Resolves with emailVerificationRequired: true when the person must click an emailed link before signing in. */
  register: (credentials: RegisterCredentials) => Promise<{ emailVerificationRequired: boolean }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load stored auth data on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    if (DEV_BYPASS_AUTH) {
      setState({ user: DEV_DUMMY_USER, token: 'dev-token', isLoading: false, isAuthenticated: true });
      return;
    }

    try {
      const [token, userStr] = await AsyncStorage.multiGet([
        'rep_rumble_token',
        'rep_rumble_user',
      ]);

      if (token[1] && userStr[1]) {
        const user = JSON.parse(userStr[1]);
        setState({
          user,
          token: token[1],
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error loading auth:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, user } = response.data.data;

      await AsyncStorage.multiSet([
        ['rep_rumble_token', token],
        ['rep_rumble_user', JSON.stringify(user)],
      ]);

      setState({
        user,
        token,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      const response = await api.post('/auth/register', credentials);
      // The server sends no token until the emailed link has been clicked.
      if (response.data.data.emailVerificationRequired) {
        return { emailVerificationRequired: true };
      }
      const { token, user } = response.data.data;

      await AsyncStorage.multiSet([
        ['rep_rumble_token', token],
        ['rep_rumble_user', JSON.stringify(user)],
      ]);

      setState({
        user,
        token,
        isLoading: false,
        isAuthenticated: true,
      });
      return { emailVerificationRequired: false };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([
      'rep_rumble_token',
      'rep_rumble_user',
      'rep_rumble_meals',
      'rep_rumble_workouts',
    ]);

    setState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const updateUser = (userData: Partial<User>) => {
    if (state.user) {
      const updatedUser = { ...state.user, ...userData };
      setState((prev) => ({ ...prev, user: updatedUser }));
      AsyncStorage.setItem('rep_rumble_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
