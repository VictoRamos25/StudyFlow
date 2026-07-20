import type { AuthUser, LoginPayload, RegisterPayload } from "../types/auth.types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface ApiError {
  detail: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).detail || "Erro desconhecido");
  }
  return data as T;
}

export async function loginUser(payload: LoginPayload): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<AuthUser>(res);
}

export async function registerUser(payload: RegisterPayload): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<AuthUser>(res);
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/auth/check-username/${username}`);
  const data = await res.json();
  return data.available as boolean;
}
