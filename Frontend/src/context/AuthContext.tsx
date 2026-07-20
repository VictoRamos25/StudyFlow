import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { AuthUser } from "../types/auth.types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "studyflow_user";

/**
 * Lê o payload JWT sem verificar a assinatura (apenas para saber a expiração).
 * A verificação real acontece sempre no backend via Firebase Admin SDK.
 */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null; // converter para ms
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return false; // se não conseguirmos ler, assumir válido
  return Date.now() >= expiry;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  // Rehydrate session from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: AuthUser = JSON.parse(raw);
        // Verificar se o token já expirou antes de restaurar a sessão
        if (parsed.token && isTokenExpired(parsed.token)) {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          setUser(parsed);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verificar expiração periodicamente (a cada 5 minutos)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (user.token && isTokenExpired(user.token)) {
        logout();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, logout]);

  const login = (authUser: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    setUser(authUser);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return ctx;
}
