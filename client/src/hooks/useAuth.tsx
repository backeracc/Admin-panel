import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type Role = 'admin' | 'hr' | 'manager' | 'employee'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  department?: string
  avatar?: string
  employeeCode?: string
}

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<{ requireOtp?: boolean } | void>
  verifyOtp: (email: string, otp: string, rememberMe: boolean) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('lsm_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    if (data.requireOtp) {
      return { requireOtp: true };
    }

    setUser(data.user);
    localStorage.setItem('lsm_user', JSON.stringify(data.user));
    localStorage.setItem('lsm_token', data.token); // Store token
  }, [])

  const verifyOtp = useCallback(async (email: string, otp: string, rememberMe: boolean) => {
    const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, rememberMe })
    });
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'OTP verification failed');
    }

    setUser(data.user);
    localStorage.setItem('lsm_user', JSON.stringify(data.user));
    localStorage.setItem('lsm_token', data.token);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: 'POST' });
    } catch(e) {} // ignore error
    setUser(null)
    localStorage.removeItem('lsm_user')
    localStorage.removeItem('lsm_token')
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
