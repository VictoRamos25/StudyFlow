import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useExams } from "../../hooks/useExams";
import { useSubjects } from "../../hooks/useSubjects";
import type { Exam, ExamCreatePayload, ExamUpdatePayload } from "../../types/exam.type";
import type { Subject } from "../../types/subject.types";
import Navbar from "../../components/ui/Navbar/Navbar";
import "./ExamPage.css";

/* ── helpers ─────────────────────────────────────────────────── */
const DIFF_LABELS: Record<number, string> = {
  1: "Muito fácil", 2: "Fácil", 3: "Médio", 4: "Difícil", 5: "Muito difícil",
};

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function urgencyClass(days: number): string {
  if (days < 0)  return "done";
  if (days === 0) return "today";
  if (days <= 3)  return "urgent";
  if (days <= 7)  return "soon";
  return "ok";
}

function countdownLabel(days: number): string {
  if (days < 0)   return "Realizado";
  if (days === 0) return "Hoje!";
  if (days === 1) return "Amanhã";
  return `${days} dias`;
}

interface Props { onNavigate: (page: string) => void; }

/* ── ExamFormModal ───────────────────────────────────────────── */
interface FormModalProps {
  initial?: Exam | null;
  subjects: Subject[];
  onClose: () => void;
  onSave: (p: ExamCreatePayload | ExamUpdatePayload) => Promise<void>;
}

function ExamFormModal({ initial, subjects, onClose, onSave }: FormModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? (subjects[0]?.id ?? ""));
  const [titulo, setTitulo]       = useState(initial?.titulo ?? "");
  const [data, setData]           = useState(initial?.data ?? today);
  const [diff, setDiff]           = useState(initial?.dificuldadeEsperada ?? 3);
  const [local, setLocal]         = useState(initial?.local ?? "");
  const [notas, setNotas]         = useState(initial?.notas ?? "");
  const [nota, setNota]           = useState(initial?.notaObtida != null ? String(initial.notaObtida) : "");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) { setError("O título é obrigatório"); return; }
    if (!subjectId)     { setError("Escolhe uma disciplina"); return; }
    if (!data)          { setError("A data é obrigatória"); return; }
    setSaving(true); setError("");
    try {
      // Ao editar: se o campo nota ficou em branco E o exame já tinha uma nota,
      // não incluímos notaObtida no payload para não apagar a nota já registada.
      // Ao criar: enviamos sempre notaObtida (null = "ainda sem nota").
      const notaObtidaField = initial
        ? (nota !== "" ? { notaObtida: parseFloat(nota) } : {})
        : { notaObtida: nota !== "" ? parseFloat(nota) : null };

      await onSave({
        subjectId,
        titulo: titulo.trim(),
        data,
        dificuldadeEsperada: diff,
        local: local.trim(),
        notas: notas.trim(),
        ...notaObtidaField,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar");
    } finally { setSaving(false); }
  };

  return (
    <div className="exam-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="exam-modal">
        <div className="exam-modal__header">
          <h2 className="exam-modal__title">{initial ? "Editar exame" : "Novo exame"}</h2>
          <button className="exam-modal__close" onClick={onClose} type="button">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form className="exam-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="exam-form__error">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <div className="exam-field">
            <label htmlFor="ef-titulo">Título *</label>
            <input id="ef-titulo" type="text" placeholder="ex: Exame Parcial — Programação Web"
              value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={120} autoFocus/>
          </div>

          <div className="exam-form__row">
            <div className="exam-field">
              <label htmlFor="ef-subject">Disciplina *</label>
              <select id="ef-subject" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                {subjects.length === 0 && <option value="">Sem disciplinas</option>}
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
            <div className="exam-field">
              <label htmlFor="ef-data">Data *</label>
              <input id="ef-data" type="date" value={data} onChange={e => setData(e.target.value)}/>
            </div>
          </div>

          <div className="exam-field">
            <label>Dificuldade esperada</label>
            <div className="exam-stars">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n} type="button"
                  className={`exam-star ${diff >= n ? "exam-star--active" : ""}`}
                  onClick={() => setDiff(n)}
                  title={DIFF_LABELS[n]}
                >
                  ★
                </button>
              ))}
              <span style={{ marginLeft: 8, fontSize: "0.82rem", color: "var(--text-secondary)", alignSelf: "center" }}>
                {DIFF_LABELS[diff]}
              </span>
            </div>
          </div>

          <div className="exam-field">
            <label htmlFor="ef-local">Local</label>
            <input id="ef-local" type="text" placeholder="ex: Sala A1, Auditório Principal"
              value={local} onChange={e => setLocal(e.target.value)}/>
          </div>

          <div className="exam-field">
            <label htmlFor="ef-nota">Nota obtida (0-20) — preenche após o exame</label>
            <input id="ef-nota" type="number" placeholder="—" min={0} max={20} step={0.1}
              value={nota} onChange={e => setNota(e.target.value)}/>
          </div>

          <div className="exam-field">
            <label htmlFor="ef-notas">Notas / observações</label>
            <textarea id="ef-notas" placeholder="Tópicos a estudar, dicas, etc."
              value={notas} onChange={e => setNotas(e.target.value)}/>
          </div>

          <div className="exam-modal__actions">
            <button type="button" className="exam-btn exam-btn--ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="exam-btn exam-btn--primary" disabled={saving}>
              {saving
                ? <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span className="exam-spinner" style={{ width:16, height:16, borderWidth:2 }}/>
                    A guardar…
                  </span>
                : <>{initial ? "Guardar alterações" : "Criar exame"}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── GradeModal ──────────────────────────────────────────────── */
interface GradeModalProps {
  exam: Exam;
  onClose: () => void;
  onSave: (nota: number | null) => Promise<void>;
}

function GradeModal({ exam, onClose, onSave }: GradeModalProps) {
  const [nota, setNota] = useState(exam.notaObtida != null ? String(exam.notaObtida) : "");
  const [saving, setSaving] = useState(false);

  const notaNum = nota !== "" ? parseFloat(nota) : null;
  const circleClass = notaNum === null ? "neutral" : notaNum >= 9.5 ? "pass" : "fail";

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(notaNum); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="exam-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="exam-modal" style={{ maxWidth: 380 }}>
        <div className="exam-modal__header">
          <h2 className="exam-modal__title">Registar nota</h2>
          <button className="exam-modal__close" onClick={onClose} type="button">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: 20 }}>
          {exam.titulo}
        </p>
        <div className="grade-preview">
          <div className={`grade-circle grade-circle--${circleClass}`}>
            {notaNum !== null ? notaNum.toFixed(1) : "—"}
          </div>
        </div>
        <div className="exam-field" style={{ marginBottom: 24 }}>
          <label htmlFor="gm-nota">Nota (0–20)</label>
          <input id="gm-nota" type="number" min={0} max={20} step={0.1}
            placeholder="ex: 14.5" value={nota}
            onChange={e => setNota(e.target.value)} autoFocus/>
        </div>
        <div className="exam-modal__actions">
          <button className="exam-btn exam-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="exam-btn exam-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? "A guardar…" : "Guardar nota"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ConfirmDeleteModal ───────────────────────────────────────── */
interface ConfirmProps {
  exam: Exam;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function ConfirmDeleteModal({ exam, onClose, onConfirm }: ConfirmProps) {
  const [loading, setLoading] = useState(false);
  const handle = async () => { setLoading(true); try { await onConfirm(); onClose(); } finally { setLoading(false); } };
  return (
    <div className="exam-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="exam-modal exam-confirm" style={{ maxWidth: 420 }}>
        <div className="exam-confirm__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 11v4M14 11v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="exam-modal__title" style={{ marginBottom: 12 }}>Eliminar exame</h2>
        <p>Tens a certeza que queres eliminar <strong>{exam.titulo}</strong>? Esta ação não pode ser desfeita.</p>
        <div className="exam-modal__actions" style={{ marginTop: 28 }}>
          <button className="exam-btn exam-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="exam-btn exam-btn--danger" onClick={handle} disabled={loading}>
            {loading ? "A eliminar…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ExamCard ────────────────────────────────────────────────── */
interface CardProps {
  exam: Exam;
  subjects: Subject[];
  animDelay: number;
  onEdit: (e: Exam) => void;
  onDelete: (e: Exam) => void;
  onGrade: (e: Exam) => void;
}

function ExamCard({ exam, subjects, animDelay, onEdit, onDelete, onGrade }: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const days = daysUntil(exam.data);
  const urg = urgencyClass(days);
  const subject = subjects.find(s => s.id === exam.subjectId);
  const isPast = days < 0;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div
      className={`exam-card exam-card--${urg} ${isPast ? "exam-card--past" : ""}`}
      style={{ animationDelay: `${animDelay * 0.06}s` }}
    >
      <div className="exam-card__body">
        <div className="exam-card__head">
          <span className="exam-card__title">{exam.titulo}</span>
          <div className="exam-card__menu" ref={menuRef}>
            <button className="exam-card__menu-btn" onClick={() => setMenuOpen(v => !v)} type="button">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="3" r="1.2" fill="currentColor"/>
                <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
                <circle cx="8" cy="13" r="1.2" fill="currentColor"/>
              </svg>
            </button>
            {menuOpen && (
              <div className="exam-card__dropdown">
                {isPast && (
                  <button className="exam-card__dd-item" onClick={() => { onGrade(exam); setMenuOpen(false); }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    {exam.notaObtida != null ? "Editar nota" : "Registar nota"}
                  </button>
                )}
                <button className="exam-card__dd-item" onClick={() => { onEdit(exam); setMenuOpen(false); }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                  Editar
                </button>
                <button className="exam-card__dd-item exam-card__dd-item--danger" onClick={() => { onDelete(exam); setMenuOpen(false); }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M6 4V2h4v2M13 4l-.8 10H3.8L3 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        {subject && (
          <div className="exam-card__subject">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: subject.cor, flexShrink: 0, display: "inline-block" }}/>
            {subject.nome}
          </div>
        )}

        <div className="exam-card__meta">
          <span className="exam-badge exam-badge--date">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M1 5h10M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {formatDate(exam.data)}
          </span>

          <span className={`exam-badge exam-badge--diff`}>
            {"★".repeat(exam.dificuldadeEsperada)}{"☆".repeat(5 - exam.dificuldadeEsperada)}
          </span>

          {exam.notaObtida != null && (
            <span className={`exam-badge ${exam.notaObtida >= 9.5 ? "exam-badge--grade-pass" : "exam-badge--grade-fail"}`}>
              {exam.notaObtida >= 9.5 ? "✓" : "✗"} {exam.notaObtida.toFixed(1)} val.
            </span>
          )}
        </div>

        {!isPast && (
          <div className={`exam-countdown exam-countdown--${urg === "today" ? "today" : urg}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            {countdownLabel(days)}
          </div>
        )}

        {exam.local && (
          <div className="exam-card__local">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1a3.5 3.5 0 010 7C4 8 1 5 1 5s3-4 5-4z" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="6" cy="4.5" r="1" fill="currentColor"/>
            </svg>
            {exam.local}
          </div>
        )}

        {exam.notas && (
          <div className="exam-card__notas">{exam.notas}</div>
        )}
      </div>
    </div>
  );
}

/* ── ExamsPage ───────────────────────────────────────────────── */
export default function ExamsPage({ onNavigate }: Props) {
  const { user, handleLogout } = useAuth();
  const { exams, loading, error, addExam, editExam, removeExam, upcoming, past, avgGrade } = useExams();
  const { subjects } = useSubjects();

  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState<"all" | "upcoming" | "past">("all");
  const [showForm, setShowForm]       = useState(false);
  const [editTarget, setEditTarget]   = useState<Exam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [gradeTarget, setGradeTarget] = useState<Exam | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const filtered = exams.filter(e => {
    const matchSearch = e.titulo.toLowerCase().includes(search.toLowerCase()) ||
      subjects.find(s => s.id === e.subjectId)?.nome.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "upcoming" && e.data >= today) ||
      (filter === "past" && e.data < today);
    return matchSearch && matchFilter;
  });

  const upcomingFiltered  = filtered.filter(e => e.data >= today);
  const pastFiltered      = filtered.filter(e => e.data < today);

  return (
    <div className="exam-root">
      {/* Particles */}
      <div className="exam-particles">
        {[...Array(12)].map((_, i) => (
          <span key={i} className="exam-particle" style={{ "--i": i } as React.CSSProperties}/>
        ))}
      </div>

      <Navbar
        activePage="exams"
        onNavigate={onNavigate}
        userName={user?.nome}
        onLogout={handleLogout}
      />

      <main className="exam-main">
        {/* Header */}
        <div className="exam-header">
          <div>
            <p className="exam-header__eyebrow">As tuas avaliações</p>
            <h1 className="exam-header__title">Exames <span>✦</span></h1>
            <p className="exam-header__sub">Regista, acompanha e prepara-te com antecedência.</p>
          </div>
          <button className="exam-add-btn" onClick={() => { setEditTarget(null); setShowForm(true); }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Novo exame
          </button>
        </div>

        {/* Stats */}
        <div className="exam-stats">
          <div className="exam-stat">
            <div className="exam-stat__icon">📅</div>
            <div>
              <div className="exam-stat__value">{upcoming.length}</div>
              <div className="exam-stat__label">Exames próximos</div>
            </div>
          </div>
          <div className="exam-stat">
            <div className="exam-stat__icon">✅</div>
            <div>
              <div className="exam-stat__value">{past.length}</div>
              <div className="exam-stat__label">Realizados</div>
            </div>
          </div>
          <div className="exam-stat">
            <div className="exam-stat__icon">🎯</div>
            <div>
              <div className="exam-stat__value">
                {upcoming.length > 0 ? `${daysUntil(upcoming[0].data)}d` : "—"}
              </div>
              <div className="exam-stat__label">Próximo exame</div>
            </div>
          </div>
          <div className="exam-stat">
            <div className="exam-stat__icon">📊</div>
            <div>
              <div className="exam-stat__value">
                {avgGrade !== null ? avgGrade.toFixed(1) : "—"}
              </div>
              <div className="exam-stat__label">Média de notas</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="exam-toolbar">
          <div className="exam-search">
            <svg className="exam-search__icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="Pesquisar exame ou disciplina…"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div className="exam-filters">
            {(["all","upcoming","past"] as const).map(f => (
              <button key={f}
                className={`exam-filter-btn ${filter === f ? "exam-filter-btn--active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Todos" : f === "upcoming" ? "Próximos" : "Realizados"}
              </button>
            ))}
          </div>
        </div>

        {/* Loading / error */}
        {loading && <div className="exam-grid"><div className="exam-loading"><div className="exam-spinner"/></div></div>}
        {!loading && error && (
          <div className="exam-grid">
            <div className="exam-error-banner">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Upcoming */}
            {(filter === "all" || filter === "upcoming") && (
              <>
                <p className="exam-section-title">Próximos</p>
                <div className="exam-grid">
                  {upcomingFiltered.length === 0 ? (
                    <div className="exam-empty">
                      <div className="exam-empty__icon">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                          <rect x="2" y="4" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M2 10h24M9 2v4M19 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <p>Nenhum exame próximo.</p>
                      <p className="exam-empty__sub">Clica em "Novo exame" para adicionar.</p>
                    </div>
                  ) : (
                    upcomingFiltered.map((e, i) => (
                      <ExamCard key={e.id} exam={e} subjects={subjects} animDelay={i}
                        onEdit={ex => { setEditTarget(ex); setShowForm(true); }}
                        onDelete={ex => setDeleteTarget(ex)}
                        onGrade={ex => setGradeTarget(ex)}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            {/* Past */}
            {(filter === "all" || filter === "past") && pastFiltered.length > 0 && (
              <>
                <p className="exam-section-title" style={{ marginTop: filter === "all" ? 40 : 0 }}>Realizados</p>
                <div className="exam-grid">
                  {pastFiltered.map((e, i) => (
                    <ExamCard key={e.id} exam={e} subjects={subjects} animDelay={i}
                      onEdit={ex => { setEditTarget(ex); setShowForm(true); }}
                      onDelete={ex => setDeleteTarget(ex)}
                      onGrade={ex => setGradeTarget(ex)}
                    />
                  ))}
                </div>
              </>
            )}

            {filtered.length === 0 && !loading && (
              <div className="exam-grid">
                <div className="exam-empty">
                  <div className="exam-empty__icon">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <rect x="2" y="4" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M2 10h24M9 2v4M19 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p>Nenhum exame encontrado.</p>
                  <p className="exam-empty__sub">Ajusta a pesquisa ou cria o teu primeiro exame.</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showForm && (
        <ExamFormModal
          initial={editTarget}
          subjects={subjects}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSave={async payload => {
            if (editTarget) await editExam(editTarget.id, payload);
            else await addExam(payload);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          exam={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => removeExam(deleteTarget.id)}
        />
      )}

      {gradeTarget && (
        <GradeModal
          exam={gradeTarget}
          onClose={() => setGradeTarget(null)}
          onSave={async nota => { await editExam(gradeTarget.id, { notaObtida: nota }); }}
        />
      )}
    </div>
  );
}