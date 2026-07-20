import type { StudyPlan } from "../types/plan.types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface ApiError { detail: string; }

async function handleResponse<T>(res: Response): Promise<T> {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Erro de rede (${res.status})`);
  }
  if (!res.ok) {
    const err = data as ApiError;
    throw new Error(err.detail || `Erro ${res.status}`);
  }
  return data as T;
}

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export async function generatePlan(token: string): Promise<StudyPlan> {
  const res = await fetch(`${API_URL}/ai/plan`, {
    method: "POST",
    headers: authHeaders(token),
  });
  const data = await handleResponse<{ plan: StudyPlan }>(res);
  return data.plan;
}

export async function getPlanHistory(token: string): Promise<{
  plans: Array<{
    id: string;
    semana: string;
    geradoEm: string;
    totalHorasPlano: number;
    proximoExame: string | null;
  }>;
  total: number;
}> {
  const res = await fetch(`${API_URL}/ai/plan/history`, {
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function downloadPlanPdf(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/export/pdf`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    let detail = `Erro ${res.status}`;
    try {
      const err = await res.json() as ApiError;
      detail = err.detail || detail;
    } catch { /* ignora */ }
    throw new Error(detail);
  }

  // Cria um link temporário e força o download no browser
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plano_semanal.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
