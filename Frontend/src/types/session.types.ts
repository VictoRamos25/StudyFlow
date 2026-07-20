export interface Session {
  id: string;
  userId: string;
  subjectId: string;
  data: string;           // "YYYY-MM-DD"
  duracaoMinutos: number;
  foco: number;           // 1-5
  humor: number | null;   // 1-5 | null
  notas: string;
  tipo: "manual" | "pomodoro";
}

export interface SessionCreatePayload {
  subjectId: string;
  data: string;
  duracaoMinutos: number;
  foco: number;
  humor?: number | null;
  notas?: string;
  tipo?: "manual" | "pomodoro";
}

export type SessionUpdatePayload = Partial<SessionCreatePayload>;

export interface SessionStats {
  totalSessoes: number;
  totalMinutos: number;
  totalHoras: number;
  mediaFoco: number;
  mediaHumor: number | null;
  minutosPorDisciplina: Record<string, number>;
}
