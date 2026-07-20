import type { Subject, SubjectCreatePayload, SubjectUpdatePayload } from "../types/subject.types";

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

export async function fetchSubjects(token: string): Promise<Subject[]> {
  const res = await fetch(`${API_URL}/subjects`, { headers: authHeaders(token) });
  const data = await handleResponse<{ subjects: Subject[]; total: number }>(res);
  return data.subjects;
}

export async function createSubject(token: string, payload: SubjectCreatePayload): Promise<Subject> {
  const res = await fetch(`${API_URL}/subjects`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<Subject>(res);
}

export async function updateSubject(token: string, id: string, payload: SubjectUpdatePayload): Promise<Subject> {
  const res = await fetch(`${API_URL}/subjects/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<Subject>(res);
}

export async function deleteSubject(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/subjects/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error((data as ApiError).detail || "Erro ao eliminar");
  }
}
