import { useState, useEffect, useCallback } from "react";
import {
  saveCurrentUser,
  getCurrentUserCredentials,
  clearCurrentUser,
} from "@/storage/secureStorage";
import { apiRequest } from "@/lib/query-client";

export interface AuthUser {
  id: string;
  email: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadAuth = useCallback(async () => {
    try {
      const credentials = await getCurrentUserCredentials();
      if (credentials) {
        setUser({ id: credentials.userId, email: credentials.email });
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Error loading auth:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const resp = await apiRequest("POST", "/api/auth/login", { email, password });
      const data = await resp.json();

      await saveCurrentUser(data.id, data.email);
      setUser({ id: data.id, email: data.email });
      setIsAuthenticated(true);
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || "";
      const jsonMatch = msg.match(/\{.*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return { success: false, error: parsed.error || "Ошибка входа" };
        } catch {}
      }
      return { success: false, error: "Неверный email или пароль" };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, verificationCode?: string) => {
    try {
      const resp = await apiRequest("POST", "/api/auth/register", { email, password, verificationCode });
      const data = await resp.json();

      await saveCurrentUser(data.id, data.email);
      setUser({ id: data.id, email: data.email });
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || "";
      const jsonMatch = msg.match(/\{.*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return { success: false, error: parsed.error || "Ошибка регистрации" };
        } catch {}
      }
      return { success: false, error: "Ошибка регистрации" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await clearCurrentUser();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  }, []);

  const getToken = useCallback(async () => {
    const credentials = await getCurrentUserCredentials();
    return credentials?.userId ?? null;
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    getToken,
    refresh: loadAuth,
  };
}
