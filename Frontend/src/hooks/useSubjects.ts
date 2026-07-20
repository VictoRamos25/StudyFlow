import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "../context/AuthContext";
import {
  fetchSubjects, createSubject, updateSubject, deleteSubject,
} from "../services/SubjectApi";
import type { Subject, SubjectCreatePayload, SubjectUpdatePayload } from "../types/subject.types";

export function useSubjects() {
  const { user } = useAuthContext();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchSubjects(user.token);
      setSubjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar disciplinas");
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => { load(); }, [load]);

  const addSubject = async (payload: SubjectCreatePayload): Promise<Subject> => {
    if (!user?.token) throw new Error("Não autenticado");
    const created = await createSubject(user.token, payload);
    setSubjects(prev => [...prev, created]);
    return created;
  };

  const editSubject = async (id: string, payload: SubjectUpdatePayload): Promise<Subject> => {
    if (!user?.token) throw new Error("Não autenticado");
    const updated = await updateSubject(user.token, id, payload);
    setSubjects(prev => prev.map(s => s.id === id ? updated : s));
    return updated;
  };

  const removeSubject = async (id: string): Promise<void> => {
    if (!user?.token) throw new Error("Não autenticado");
    await deleteSubject(user.token, id);
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  return { subjects, loading, error, reload: load, addSubject, editSubject, removeSubject };
}
