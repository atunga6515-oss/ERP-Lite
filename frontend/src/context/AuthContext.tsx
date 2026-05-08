"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter, usePathname } from 'next/navigation';

interface Permission {
  module_name: string;
  can_access: boolean;
}

interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  permissions: Permission[];
  login: (data: any) => void;
  logout: () => void;
  hasPermission: (module: string) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeoutMinutes, setTimeoutMinutes] = useState(5);
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    setUser(null);
    setPermissions([]);
    router.push('/login');
  }, [router]);

  // Load auth from local storage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedPerms = localStorage.getItem('permissions');

    if (token && savedUser && savedPerms) {
      setUser(JSON.parse(savedUser));
      setPermissions(JSON.parse(savedPerms));
    }
    setLoading(false);

    // Fetch session timeout setting
    const baseURL = typeof window !== "undefined" ? `http://${window.location.hostname}:8080/api` : "http://localhost:8080/api";
    axios.get(`${baseURL}/settings`).then(res => {
      if (res.data.session_timeout) {
        setTimeoutMinutes(Number(res.data.session_timeout));
      }
    }).catch(() => {});
  }, []);

  const login = (data: any) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('permissions', JSON.stringify(data.permissions));
    setUser(data.user);
    setPermissions(data.permissions);
    router.push('/');
  };

  const hasPermission = (module: string) => {
    if (user?.is_admin) return true;
    const perm = permissions.find(p => p.module_name === module);
    return perm ? perm.can_access : false;
  };

  // Idle Timer Logic
  useEffect(() => {
    if (!user) return;

    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        alert("Oturumunuz zaman aşımına uğradı.");
        logout();
      }, timeoutMinutes * 60 * 1000);
    };

    // Events to track
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [user, timeoutMinutes, logout]);

  // Protect Routes
  useEffect(() => {
    if (!loading && !user && pathname !== '/login' && pathname !== '/sifre-belirle') {
      router.push('/login');
    }
  }, [user, pathname, loading, router]);

  return (
    <AuthContext.Provider value={{ user, permissions, login, logout, hasPermission, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
