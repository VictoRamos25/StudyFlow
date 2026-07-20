export interface Exam {
  id: string;
  userId: string;
  subjectId: string;
  titulo: string;
  data: string;              // "YYYY-MM-DD"
  dificuldadeEsperada: number; // 1-5
  local: string;
  notas: string;
  notaObtida: number | null;
}

export interface ExamCreatePayload {
  subjectId: string;
  titulo: string;
  data: string;
  dificuldadeEsperada: number;
  local?: string;
  notas?: string;
  notaObtida?: number | null;
}

export type ExamUpdatePayload = Partial<ExamCreatePayload>;