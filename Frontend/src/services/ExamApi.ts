import type { Exam, ExamCreatePayload, ExamUpdatePayload } from "../types/exam.type";

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

export async function fetchExams(token: string, subjectId?: string): Promise<Exam[]> {
  const url = subjectId
    ? `${API_URL}/exams?subjectId=${subjectId}`
    : `${API_URL}/exams`;
  const res = await fetch(url, { headers: authHeaders(token) });
  const data = await handleResponse<{ exams: Exam[]; total: number }>(res);
  return data.exams;
}

export async function createExam(token: string, payload: ExamCreatePayload): Promise<Exam> {
  const res = await fetch(`${API_URL}/exams`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<Exam>(res);
}

export async function updateExam(token: string, id: string, payload: ExamUpdatePayload): Promise<Exam> {
  const res = await fetch(`${API_URL}/exams/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<Exam>(res);
}

export async function deleteExam(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/exams/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error((data as ApiError).detail || "Erro ao eliminar");
  }
}