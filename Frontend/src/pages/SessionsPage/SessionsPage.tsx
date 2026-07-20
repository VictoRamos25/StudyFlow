import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useSessions } from "../../hooks/useSessions";
import { useSubjects } from "../../hooks/useSubjects";
import type { Session, SessionCreatePayload } from "../../types/session.types";
import type { Subject } from "../../types/subject.types";
import Navbar from "../../components/ui/Navbar/Navbar";
import PomodoroTimer from "../../components/PomodoroTimer/PomodoroTimer";
import "./SessionsPage.css";

/* ── helpers ─────────────────────────────────────────────────── */
const FOCO_LABELS = ["", "😴 Muito baixo", "😐 Baixo", "🙂 Médio", "😊 Bom", "🔥 Excelente"];
const HUMOR_LABELS = ["", "😔 Muito mau", "😕 Mau", "😐 Neutro", "🙂 Bom", "😁 Ótimo"];

function formatDuracao(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

interface Props { onNavigate: (page: string) => void; }

/* ── Pomodoro pre-fill type ──────────────────────────────────── */
interface PomodoroResult {
  subjectId: string;
  duracaoMinutos: number;
  pomodorosConcluidos: number;
  tipo: "pomodoro";
}

/* ── SessionFormModal ────────────────────────────────────────── */
interface FormModalProps {
  initial?: Session | null;
  subjects: Subject[];
  onClose: () => void;
  onSave: (payload: SessionCreatePayload) => Promise<void>;
  /** Pré-preenche dados vindos do Pomodoro */
  pomodoroPreFill?: PomodoroResult | null;
}

function SessionFormModal({ initial, subjects, onClose, onSave, pomodoroPreFill }: FormModalProps) {
  const prefillMinutes = pomodoroPreFill?.duracaoMinutos ?? (initial?.duracaoMinutos ?? 60);

  const [subjectId, setSubjectId] = useState(
    pomodoroPreFill?.subjectId ?? initial?.subjectId ?? (subjects[0]?.id ?? "")
  );
  const [data, setData]           = useState(initial?.data ?? todayISO());
  const [horas, setHoras]         = useState(String(Math.floor(prefillMinutes / 60)));
  const [mins, setMins]           = useState(String(prefillMinutes % 60));
  const [foco, setFoco]           = useState(initial?.foco ?? 3);
  const [humor, setHumor]         = useState<number | "">(initial?.humor ?? "");
  const [notas, setNotas]         = useState(initial?.notas ?? "");
  const [tipo, setTipo]           = useState<"manual" | "pomodoro">(
    pomodoroPreFill ? "pomodoro" : (initial?.tipo ?? "manual")
  );
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const totalMinutos = (parseInt(horas) || 0) * 60 + (parseInt(mins) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) { setError("Seleciona uma disciplina"); return; }
    if (totalMinutos < 1) { setError("A duração deve ser pelo menos 1 minuto"); return; }
    setSaving(true); setError("");
    try {
      await onSave({
        subjectId, data, duracaoMinutos: totalMinutos, foco,
        humor: humor === "" ? null : humor,
        notas: notas.trim(), tipo,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sess-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sess-modal">
        <div className="sess-modal__header">
          <h2 className="sess-modal__title">
            {pomodoroPreFill
              ? "🍅 Guardar sessão Pomodoro"
              : initial
                ? "Editar sessão"
                : "Registar sessão"
            }
          </h2>
          <button className="sess-modal__close" onClick={onClose} type="button">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Pomodoro summary banner */}
        {pomodoroPreFill && (
          <div className="sess-pomo-banner">
            <span className="sess-pomo-banner__emoji">🍅</span>
            <div>
              <span className="sess-pomo-banner__label">Pomodoros concluídos</span>
              <span className="sess-pomo-banner__value">
                {pomodoroPreFill.pomodorosConcluidos} × pomodoro
                &nbsp;·&nbsp; {pomodoroPreFill.duracaoMinutos} min de foco
              </span>
            </div>
          </div>
        )}

        <form className="sess-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="sess-form__error">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <div className="sess-field">
            <label htmlFor="sf-subject">Disciplina *</label>
            <select id="sf-subject" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
              {subjects.length === 0 && <option value="">Sem disciplinas — cria primeiro</option>}
              {subjects.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>

          <div className="sess-form__row">
            <div className="sess-field">
              <label htmlFor="sf-data">Data *</label>
              <input id="sf-data" type="date" value={data} onChange={e => setData(e.target.value)} max={todayISO()} />
            </div>
            <div className="sess-field">
              <label htmlFor="sf-tipo">Tipo</label>
              <select id="sf-tipo" value={tipo} onChange={e => setTipo(e.target.value as "manual" | "pomodoro")}>
                <option value="manual">⌨️ Manual</option>
                <option value="pomodoro">🍅 Pomodoro</option>
              </select>
            </div>
          </div>

          <div className="sess-field">
            <label>Duração *</label>
            <div className="sess-form__row">
              <div className="sess-field sess-field--inline">
                <input type="number" placeholder="0" min="0" max="23" value={horas} onChange={e => setHoras(e.target.value)} />
                <span className="sess-field__unit">h</span>
              </div>
              <div className="sess-field sess-field--inline">
                <input type="number" placeholder="0" min="0" max="59" value={mins} onChange={e => setMins(e.target.value)} />
                <span className="sess-field__unit">min</span>
              </div>
            </div>
            {totalMinutos > 0 && <span className="sess-field__hint">Total: {formatDuracao(totalMinutos)}</span>}
          </div>

          <div className="sess-field">
            <label>Nível de foco *</label>
            <div className="sess-stars">
              {[1,2,3,4,5].map(v => (
                <button key={v} type="button"
                  className={`sess-star ${foco >= v ? "sess-star--active" : ""}`}
                  onClick={() => setFoco(v)} title={FOCO_LABELS[v]}>★</button>
              ))}
              <span className="sess-stars__label">{FOCO_LABELS[foco]}</span>
            </div>
          </div>

          <div className="sess-field">
            <label>Humor <span className="sess-field__optional">(opcional)</span></label>
            <div className="sess-stars">
              {[1,2,3,4,5].map(v => (
                <button key={v} type="button"
                  className={`sess-star sess-star--humor ${humor !== "" && humor >= v ? "sess-star--active" : ""}`}
                  onClick={() => setHumor(humor === v ? "" : v)} title={HUMOR_LABELS[v]}>★</button>
              ))}
              {humor !== "" && <span className="sess-stars__label">{HUMOR_LABELS[humor as number]}</span>}
            </div>
          </div>

          <div className="sess-field">
            <label htmlFor="sf-notas">Notas <span className="sess-field__optional">(opcional)</span></label>
            <textarea id="sf-notas" placeholder="O que estudaste? Como correu?"
              value={notas} onChange={e => setNotas(e.target.value)} rows={3} maxLength={500} />
          </div>

          <div className="sess-modal__actions">
            <button type="button" className="sess-btn sess-btn--ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="sess-btn sess-btn--primary" disabled={saving}>
              {saving ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="sess-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  A guardar…
                </span>
              ) : <>{initial ? "Guardar alterações" : "Registar sessão"}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── ConfirmDeleteModal ──────────────────────────────────────── */
interface ConfirmProps {
  session: Session;
  subjectName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function ConfirmDeleteModal({ session, subjectName, onClose, onConfirm }: ConfirmProps) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try { await onConfirm(); onClose(); }
    catch { setLoading(false); }
  };
  return (
    <div className="sess-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sess-modal sess-confirm">
        <div className="sess-confirm__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 11v4M14 11v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="sess-modal__title" style={{ marginBottom: 12 }}>Eliminar sessão</h2>
        <p>Tens a certeza que queres eliminar a sessão de <strong>{subjectName}</strong> em <strong>{session.data}</strong>?</p>
        <div className="sess-modal__actions" style={{ marginTop: 28 }}>
          <button className="sess-btn sess-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="sess-btn sess-btn--danger" onClick={handle} disabled={loading}>
            {loading ? "A eliminar…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── SessionCard ─────────────────────────────────────────────── */
interface CardProps {
  session: Session;
  subjectName: string;
  subjectColor: string;
  onEdit: (s: Session) => void;
  onDelete: (s: Session) => void;
  animDelay: number;
}

function SessionCard({ session, subjectName, subjectColor, onEdit, onDelete, animDelay }: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="sess-card" style={{ animationDelay: `${animDelay * 0.06}s` }}>
      <div className="sess-card__accent" style={{ background: subjectColor }} />
      <div className="sess-card__body">
        <div className="sess-card__head">
          <div className="sess-card__info">
            <span className="sess-card__subject">{subjectName}</span>
            <span className="sess-card__date">{session.data}</span>
          </div>
          <div className="sess-card__menu" ref={menuRef}>
            <button className="sess-card__menu-btn" onClick={() => setMenuOpen(v => !v)} aria-label="Opções">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="3" r="1.2" fill="currentColor"/>
                <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
                <circle cx="8" cy="13" r="1.2" fill="currentColor"/>
              </svg>
            </button>
            {menuOpen && (
              <div className="sess-card__dropdown">
                <button className="sess-card__dropdown-item" onClick={() => { onEdit(session); setMenuOpen(false); }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                  Editar
                </button>
                <button className="sess-card__dropdown-item sess-card__dropdown-item--danger" onClick={() => { onDelete(session); setMenuOpen(false); }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M6 4V2h4v2M13 4l-.8 10H3.8L3 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="sess-card__stats">
          <div className="sess-card__stat">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            {formatDuracao(session.duracaoMinutos)}
          </div>
          <div className="sess-card__stat">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1l1.5 4H13l-3.7 2.7 1.4 4.3L7 9.3 3.3 12l1.4-4.3L1 5h4.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
            Foco {session.foco}/5
          </div>
          {session.humor !== null && (
            <div className="sess-card__stat">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
                <circle cx="5" cy="6" r="0.8" fill="currentColor"/>
                <circle cx="9" cy="6" r="0.8" fill="currentColor"/>
                <path d="M4.5 9c.7 1 4.3 1 5 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Humor {session.humor}/5
            </div>
          )}
          <span className={`sess-tipo-badge ${session.tipo === "pomodoro" ? "sess-tipo-badge--pomodoro" : ""}`}>
            {session.tipo === "pomodoro" ? "🍅 Pomodoro" : "⌨️ Manual"}
          </span>
        </div>

        {session.notas && <p className="sess-card__notas">{session.notas}</p>}
      </div>
    </div>
  );
}

/* ── SessionsPage ────────────────────────────────────────────── */
export default function SessionsPage({ onNavigate }: Props) {
  const { user, handleLogout } = useAuth();
  const { subjects } = useSubjects();

  const [filterSubject, setFilterSubject] = useState("");
  const [filterInicio, setFilterInicio]   = useState("");
  const [filterFim, setFilterFim]         = useState("");

  const { sessions, stats, loading, error, addSession, editSession, removeSession } = useSessions({
    subjectId: filterSubject || undefined,
    dataInicio: filterInicio || undefined,
    dataFim: filterFim || undefined,
  });

  const [showForm, setShowForm]           = useState(false);
  const [editTarget, setEditTarget]       = useState<Session | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<Session | null>(null);
  const [showPomodoro, setShowPomodoro]   = useState(false);
  const [pomodoroResult, setPomodoroResult] = useState<PomodoroResult | null>(null);

  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

  /** Chamado pelo PomodoroTimer quando o utilizador quer guardar */
  function handlePomodoroSave(result: PomodoroResult) {
    setPomodoroResult(result);
    setEditTarget(null);
    setShowPomodoro(false);
    setShowForm(true);
  }

  /** Quando o modal de sessão fecha, limpa o resultado do pomodoro */
  function handleFormClose() {
    setShowForm(false);
    setEditTarget(null);
    setPomodoroResult(null);
  }

  return (
    <div className="sess-root">
      {/* Particles */}
      <div className="sess-particles">
        {[...Array(12)].map((_, i) => (
          <span key={i} className="sess-particle" style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>

      <Navbar
        activePage="sessions"
        onNavigate={onNavigate}
        userName={user?.nome}
        onLogout={handleLogout}
      />

      <main className="sess-main">

        <div className="sess-header">
          <div className="sess-header__left">
            <p className="sess-header__eyebrow">As tuas sessões</p>
            <h1 className="sess-header__title">Sessões de Estudo <span>✦</span></h1>
            <p className="sess-header__sub">Regista e acompanha cada sessão de estudo.</p>
          </div>

          {/* Action buttons */}
          <div className="sess-header__actions">
            <button
              className="sess-pomodoro-btn"
              onClick={() => setShowPomodoro(true)}
              title="Iniciar sessão Pomodoro"
            >
              <span className="sess-pomodoro-btn__icon">🍅</span>
              Pomodoro
            </button>
            <button className="sess-add-btn" onClick={() => { setEditTarget(null); setPomodoroResult(null); setShowForm(true); }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Nova sessão
            </button>
          </div>
        </div>

        {stats && (
          <div className="sess-stats">
            <div className="sess-stat">
              <div className="sess-stat__icon">📖</div>
              <div className="sess-stat__info">
                <div className="sess-stat__value">{stats.totalSessoes}</div>
                <div className="sess-stat__label">Sessões registadas</div>
              </div>
            </div>
            <div className="sess-stat">
              <div className="sess-stat__icon">⏱</div>
              <div className="sess-stat__info">
                <div className="sess-stat__value">{stats.totalHoras}h</div>
                <div className="sess-stat__label">Total de estudo</div>
              </div>
            </div>
            <div className="sess-stat">
              <div className="sess-stat__icon">⭐</div>
              <div className="sess-stat__info">
                <div className="sess-stat__value">{stats.mediaFoco > 0 ? stats.mediaFoco.toFixed(1) : "—"}</div>
                <div className="sess-stat__label">Foco médio</div>
              </div>
            </div>
            <div className="sess-stat">
              <div className="sess-stat__icon">😊</div>
              <div className="sess-stat__info">
                <div className="sess-stat__value">{stats.mediaHumor ? stats.mediaHumor.toFixed(1) : "—"}</div>
                <div className="sess-stat__label">Humor médio</div>
              </div>
            </div>
          </div>
        )}

        <div className="sess-toolbar">
          <div className="sess-filter-row">
            <div className="sess-field sess-field--filter">
              <label>Disciplina</label>
              <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                <option value="">Todas</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div className="sess-field sess-field--filter">
              <label>De</label>
              <input type="date" value={filterInicio} onChange={e => setFilterInicio(e.target.value)} />
            </div>
            <div className="sess-field sess-field--filter">
              <label>Até</label>
              <input type="date" value={filterFim} onChange={e => setFilterFim(e.target.value)} />
            </div>
            {(filterSubject || filterInicio || filterFim) && (
              <button className="sess-btn sess-btn--ghost sess-clear-btn"
                onClick={() => { setFilterSubject(""); setFilterInicio(""); setFilterFim(""); }}>
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        <div className="sess-list">
          {loading && <div className="sess-loading"><div className="sess-spinner" /></div>}
          {!loading && error && (
            <div className="sess-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}
          {!loading && !error && sessions.length === 0 && (
            <div className="sess-empty">
              <div className="sess-empty__icon">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M18 10v8.5l5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p>Ainda não tens sessões registadas.</p>
              <p className="sess-empty__sub">
                Clica em "Nova sessão" para registar manualmente, ou em "🍅 Pomodoro" para estudar com timer.
              </p>
            </div>
          )}
          {!loading && sessions.map((s, i) => (
            <SessionCard
              key={s.id} session={s} animDelay={i}
              subjectName={subjectMap[s.subjectId]?.nome ?? "Disciplina desconhecida"}
              subjectColor={subjectMap[s.subjectId]?.cor ?? "#7EB8F7"}
              onEdit={sess => { setEditTarget(sess); setPomodoroResult(null); setShowForm(true); }}
              onDelete={sess => setDeleteTarget(sess)}
            />
          ))}
        </div>
      </main>

      {/* Pomodoro Timer */}
      {showPomodoro && (
        <PomodoroTimer
          subjects={subjects}
          onClose={() => setShowPomodoro(false)}
          onSaveSession={handlePomodoroSave}
        />
      )}

      {/* Session form — pode vir do Pomodoro (pomodoroResult) ou manual */}
      {showForm && (
        <SessionFormModal
          initial={editTarget}
          subjects={subjects}
          pomodoroPreFill={pomodoroResult}
          onClose={handleFormClose}
          onSave={async payload => {
            if (editTarget) await editSession(editTarget.id, payload);
            else await addSession(payload);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          session={deleteTarget}
          subjectName={subjectMap[deleteTarget.subjectId]?.nome ?? "sessão"}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => removeSession(deleteTarget.id)}
        />
      )}
    </div>
  );
}
