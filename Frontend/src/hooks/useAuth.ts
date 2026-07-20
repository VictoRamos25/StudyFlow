import { useState } from "react";
import { loginUser, registerUser, checkUsernameAvailable } from "../services/AuthApi";
import { useAuthContext } from "../context/AuthContext";
import type { LoginPayload, RegisterPayload } from "../types/auth.types";

export function useAuth() {
  const { user, login, logout, isAuthenticated, isLoading } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const clearError = () => setError("");

  const handleLogin = async (payload: LoginPayload) => {
    setLoading(true);
    setError("");
    try {
      const res = await loginUser(payload);
      login(res);
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (payload: RegisterPayload) => {
    setLoading(true);
    setError("");
    try {
      const res = await registerUser(payload);
      login(res);
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar conta";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const checkUsername = async (username: string): Promise<boolean> => {
    try {
      return await checkUsernameAvailable(username);
    } catch {
      return true; // assume available on network error
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    loading,
    error,
    clearError,
    handleLogin,
    handleRegister,
    handleLogout,
    checkUsername,
  };
}
