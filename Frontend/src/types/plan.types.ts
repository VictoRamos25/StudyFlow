export interface PlanDayBlock {
  disciplina: string;
  subjectId: string;
  cor: string;
  horas: number;
  descricao: string;
}

export interface PlanDay {
  data: string;       // "YYYY-MM-DD"
  diaSemana: string;  // "Segunda-feira", etc.
  blocos: PlanDayBlock[];
  totalMinutos: number;
}

export interface StudyPlan {
  semana: string;       // "2026-W20"
  geradoEm: string;     // ISO timestamp
  diasAteExame: number | null;
  proximoExame: string | null;
  dias: PlanDay[];
  totalHorasPlano: number;
  mensagemIA: string;
}

export interface PlanGenerateResponse {
  plan: StudyPlan;
}
