export interface Subject {
  id: string;
  userId: string;
  nome: string;
  creditos: number;
  prioridade: "baixa" | "media" | "alta";
  objetivoSemanalHoras: number;
  cor: string;
}

export interface SubjectCreatePayload {
  nome: string;
  creditos: number;
  prioridade: "baixa" | "media" | "alta";
  objetivoSemanalHoras: number;
  cor: string;
}

export type SubjectUpdatePayload = Partial<SubjectCreatePayload>;
