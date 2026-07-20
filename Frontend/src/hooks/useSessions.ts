import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "../context/AuthContext";
import {
  fetchSessions, fetchSessionStats,
  createSession, updateSession, deleteSession,
} from "../services/SessionApi";
import type {
  Session, SessionCreatePayload, SessionUpdatePayload, SessionStats,
} from "../types/session.types";

interface Filters {
  subjectId?: string;
  dataInicio?: string;
  dataFim?: string;
}

export function useSessions(filters?: Filters) {
  const { user } = useAuthContext();
  const [sessions, setSessions]   = useState<Session[]>([]);
  const [stats, setStats]         = useState<SessionStats | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const load = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError("");
    try {
      const [data, statsData] = await Promise.all([
        fetchSessions(user.token, filters),
        fetchSessionStats(user.token, {
          dataInicio: filters?.dataInicio,
          dataFim: filters?.dataFim,
        }),
      ]);
      setSessions(data);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar sessões");
    } finally {
      setLoading(false);
    }
  }, [user?.token, filters?.subjectId, filters?.dataInicio, filters?.dataFim]);

  useEffect(() => { load(); }, [load]);

  const addSession = async (payload: SessionCreatePayload): Promise<Session> => {
    if (!user?.token) throw new Error("Não autenticado");
    const created = await createSession(user.token, payload);
    setSessions(prev => [created, ...prev]);
    load(); // recarrega stats
    return created;
  };

  const editSession = async (id: string, payload: SessionUpdatePayload): Promise<Session> => {
    if (!user?.token) throw new Error("Não autenticado");
    const updated = await updateSession(user.token, id, payload);
    setSessions(prev => prev.map(s => s.id === id ? updated : s));
    load();
    return updated;
  };

  const removeSession = async (id: string): Promise<void> => {
    if (!user?.token) throw new Error("Não autenticado");
    await deleteSession(user.token, id);
    setSessions(prev => prev.filter(s => s.id !== id));
    load();
  };

  return { sessions, stats, loading, error, reload: load, addSession, editSession, removeSession };
}
