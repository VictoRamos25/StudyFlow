import type {
  Session, SessionCreatePayload, SessionUpdatePayload, SessionStats,
} from "../types/session.types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface ApiError { detail: string; }

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error((data as ApiError).detail || "Erro desconhecido");
  return data as T;
}

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export async function fetchSessions(
  token: string,
  filters?: { subjectId?: string; dataInicio?: string; dataFim?: string },
): Promise<Session[]> {
  const params = new URLSearchParams();
  if (filters?.subjectId) params.set("subjectId", filters.subjectId);
  if (filters?.dataInicio) params.set("dataInicio", filters.dataInicio);
  if (filters?.dataFim)    params.set("dataFim", filters.dataFim);
  const qs = params.toString() ? `?${params}` : "";
  const res = await fetch(`${API_URL}/sessions${qs}`, { headers: authHeaders(token) });
  const data = await handleResponse<{ sessions: Session[]; total: number }>(res);
  return data.sessions;
}

export async function fetchSessionStats(
  token: string,
  filters?: { dataInicio?: string; dataFim?: string },
): Promise<SessionStats> {
  const params = new URLSearchParams();
  if (filters?.dataInicio) params.set("dataInicio", filters.dataInicio);
  if (filters?.dataFim)    params.set("dataFim", filters.dataFim);
  const qs = params.toString() ? `?${params}` : "";
  const res = await fetch(`${API_URL}/sessions/stats${qs}`, { headers: authHeaders(token) });
  return handleResponse<SessionStats>(res);
}

export async function createSession(
  token: string,
  payload: SessionCreatePayload,
): Promise<Session> {
  const res = await fetch(`${API_URL}/sessions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<Session>(res);
}

export async function updateSession(
  token: string,
  id: string,
  payload: SessionUpdatePayload,
): Promise<Session> {
  const res = await fetch(`${API_URL}/sessions/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<Session>(res);
}

export async function deleteSession(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/sessions/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error((data as ApiError).detail || "Erro ao eliminar");
  }
}
