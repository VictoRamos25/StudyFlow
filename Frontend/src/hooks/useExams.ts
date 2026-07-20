import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "../context/AuthContext";
import { fetchExams, createExam, updateExam, deleteExam } from "../services/ExamApi";
import type { Exam, ExamCreatePayload, ExamUpdatePayload } from "../types/exam.type";

export function useExams() {
  const { user } = useAuthContext();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchExams(user.token);
      setExams(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar exames");
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => { load(); }, [load]);

  const addExam = async (payload: ExamCreatePayload): Promise<Exam> => {
    if (!user?.token) throw new Error("Não autenticado");
    const created = await createExam(user.token, payload);
    setExams(prev => [...prev, created].sort((a, b) => a.data.localeCompare(b.data)));
    return created;
  };

  const editExam = async (id: string, payload: ExamUpdatePayload): Promise<Exam> => {
    if (!user?.token) throw new Error("Não autenticado");
    const updated = await updateExam(user.token, id, payload);
    setExams(prev =>
      prev.map(e => e.id === id ? updated : e).sort((a, b) => a.data.localeCompare(b.data))
    );
    return updated;
  };

  const removeExam = async (id: string): Promise<void> => {
    if (!user?.token) throw new Error("Não autenticado");
    await deleteExam(user.token, id);
    setExams(prev => prev.filter(e => e.id !== id));
  };

  // Helpers de agregação
  const upcoming = exams.filter(e => e.data >= new Date().toISOString().split("T")[0]);
  const past = exams.filter(e => e.data < new Date().toISOString().split("T")[0]);
  const withGrade = exams.filter(e => e.notaObtida !== null);
  const avgGrade = withGrade.length > 0
    ? withGrade.reduce((acc, e) => acc + (e.notaObtida ?? 0), 0) / withGrade.length
    : null;

  return { exams, loading, error, reload: load, addExam, editExam, removeExam, upcoming, past, avgGrade };
}