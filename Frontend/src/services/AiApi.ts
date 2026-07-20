import type { ChatMessage } from "../types/ai.types";

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

// ── Chat ─────────────────────────────────────────────────────────────────────
export async function sendChatMessage(
  token: string,
  message: string,
  history: ChatMessage[],
): Promise<string> {
  const res = await fetch(`${API_URL}/ai/chat`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ message, history }),
  });
  const data = await handleResponse<{ reply: string }>(res);
  return data.reply;
}

export async function fetchChatHistory(token: string): Promise<ChatMessage[]> {
  const res = await fetch(`${API_URL}/ai/chat/history`, {
    headers: authHeaders(token),
  });
  const data = await handleResponse<{ messages: Array<{ role: string; content: string }> }>(res);
  return data.messages.map(m => ({ role: m.role as "user" | "model", content: m.content }));
}

// ── Sugestões ─────────────────────────────────────────────────────────────────
export interface Suggestion {
  id: string;
  userId: string;
  mensagem: string;
  tipo: string;
  subjectId: string;
  lida: boolean;
}

export async function fetchSuggestions(token: string): Promise<Suggestion[]> {
  const res = await fetch(`${API_URL}/ai/suggestions`, {
    headers: authHeaders(token),
  });
  const data = await handleResponse<{ suggestions: Suggestion[] }>(res);
  return data.suggestions;
}

export async function generateSuggestions(token: string): Promise<Suggestion[]> {
  const res = await fetch(`${API_URL}/ai/suggestions/generate`, {
    method: "POST",
    headers: authHeaders(token),
  });
  const data = await handleResponse<{ suggestions: Suggestion[] }>(res);
  return data.suggestions;
}

export async function markSuggestionRead(token: string, id: string): Promise<void> {
  await fetch(`${API_URL}/ai/suggestions/${id}/read`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardData {
  horasSemanais: number;
  totalSessoesSemanais: number;
  mediaFocoSemanal: number;
  streak: number;
  totalSessoes: number;
  totalHoras: number;
  subjectStats: Array<{
    subjectId: string;
    nome: string;
    cor: string;
    minutosEstudados: number;
    objetivoMinutos: number;
    percentagem: number;
  }>;
  proximoExame: {
    id: string;
    titulo: string;
    data: string;
    subjectNome: string;
    diasRestantes: number;
  } | null;
  sugestoesNaoLidas: number;
}

export async function fetchDashboard(token: string): Promise<DashboardData> {
  const res = await fetch(`${API_URL}/ai/dashboard`, {
    headers: authHeaders(token),
  });
  return handleResponse<DashboardData>(res);
}
