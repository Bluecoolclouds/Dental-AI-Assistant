import { useState, useEffect, useCallback } from "react";
import {
  createUser,
  getUserByEmail,
  verifyPassword,
  getUserById,
} from "@/storage/repositories/userRepository";
import {
  saveCurrentUser,
  getCurrentUserId,
  getCurrentUserCredentials,
  clearCurrentUser,
} from "@/storage/secureStorage";
import { createProfile } from "@/storage/repositories/profileRepository";

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
        const dbUser = await getUserById(credentials.userId);
        if (dbUser) {
          setUser({ id: dbUser.id, email: dbUser.email });
          setIsAuthenticated(true);
        } else {
          await clearCurrentUser();
        }
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
      const dbUser = await verifyPassword(email, password);
      
      if (!dbUser) {
        return { success: false, error: "Неверный email или пароль" };
      }
      
      await saveCurrentUser(dbUser.id, dbUser.email);
      
      setUser({ id: dbUser.id, email: dbUser.email });
      setIsAuthenticated(true);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Ошибка входа" };
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return { success: false, error: "Пользователь с таким email уже существует" };
      }
      
      const newUser = await createUser({ email, password });
      
      await createProfile({ userId: newUser.id });
      
      await saveCurrentUser(newUser.id, newUser.email);
      
      setUser({ id: newUser.id, email: newUser.email });
      setIsAuthenticated(true);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Ошибка регистрации" };
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
    return getCurrentUserId();
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
