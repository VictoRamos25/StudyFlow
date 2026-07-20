import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useSubjects } from "../../hooks/useSubjects";
import type { Subject, SubjectCreatePayload } from "../../types/subject.types";
import Navbar from "../../components/ui/Navbar/Navbar";
import "./SubjectsPage.css";

const PRESET_COLORS = [
  "#7EB8F7", "#A78BFA", "#34D399", "#FBBF24",
  "#F87171", "#FB923C", "#60A5FA", "#E879F9",
  "#4ADE80", "#F472B6",
];

const PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

interface Props {
  onNavigate: (page: string) => void;
}

/* ── SubjectFormModal ─────────────────────────────────────────── */
interface FormModalProps {
  initial?: Subject | null;
  onClose: () => void;
  onSave: (payload: SubjectCreatePayload) => Promise<void>;
}

function SubjectFormModal({ initial, onClose, onSave }: FormModalProps) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [creditos, setCreditos] = useState(String(initial?.creditos ?? 0));
  const [prioridade, setPrioridade] = useState<"baixa" | "media" | "alta">(initial?.prioridade ?? "media");
  const [objetivo, setObjetivo] = useState(String(initial?.objetivoSemanalHoras ?? 0));
  const [cor, setCor] = useState(initial?.cor ?? PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { setError("O nome da disciplina é obrigatório"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({
        nome: nome.trim(),
        creditos: parseInt(creditos) || 0,
        prioridade,
        objetivoSemanalHoras: parseFloat(objetivo) || 0,
        cor,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="subj-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="subj-modal">
        <div className="subj-modal__header">
          <h2 className="subj-modal__title">
            {initial ? "Editar disciplina" : "Nova disciplina"}
          </h2>
          <button className="subj-modal__close" onClick={onClose} type="button">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form className="subj-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="subj-form__error">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <div className="subj-field">
            <label htmlFor="sf-nome">Nome da disciplina *</label>
            <input
              id="sf-nome" type="text" placeholder="ex: Programação Web"
              value={nome} onChange={e => setNome(e.target.value)}
              maxLength={100} autoFocus
            />
          </div>

          <div className="subj-form__row">
            <div className="subj-field">
              <label htmlFor="sf-creditos">Créditos ECTS</label>
              <input
                id="sf-creditos" type="number" placeholder="0"
                value={creditos} onChange={e => setCreditos(e.target.value)}
                min={0} max={30}
              />
            </div>
            <div className="subj-field">
              <label htmlFor="sf-objetivo">Objetivo semanal (h)</label>
              <input
                id="sf-objetivo" type="number" placeholder="0" step="0.5"
                value={objetivo} onChange={e => setObjetivo(e.target.value)}
                min={0} max={168}
              />
            </div>
          </div>

          <div className="subj-field">
            <label htmlFor="sf-prioridade">Prioridade</label>
            <select
              id="sf-prioridade"
              value={prioridade}
              onChange={e => setPrioridade(e.target.value as "baixa" | "media" | "alta")}
            >
              <option value="baixa">🟢 Baixa</option>
              <option value="media">🟡 Média</option>
              <option value="alta">🔴 Alta</option>
            </select>
          </div>

          <div className="subj-field">
            <label>Cor</label>
            <div className="subj-colors">
              {PRESET_COLORS.map(c => (
                <button
                  key={c} type="button"
                  className={`subj-color-opt ${cor === c ? "subj-color-opt--selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setCor(c)}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="subj-modal__actions">
            <button type="button" className="subj-btn subj-btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="subj-btn subj-btn--primary" disabled={saving}>
              {saving ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="subj-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  A guardar…
                </span>
              ) : (
                <>{initial ? "Guardar alterações" : "Criar disciplina"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── ConfirmDeleteModal ───────────────────────────────────────── */
interface ConfirmProps {
  subject: Subject;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function ConfirmDeleteModal({ subject, onClose, onConfirm }: ConfirmProps) {
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(); onClose(); }
    catch { setLoading(false); }
  };
  return (
    <div className="subj-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="subj-modal subj-confirm">
        <div className="subj-confirm__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 11v4M14 11v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="subj-modal__title" style={{ marginBottom: 12 }}>Eliminar disciplina</h2>
        <p>
          Tens a certeza que queres eliminar <strong>{subject.nome}</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div className="subj-modal__actions" style={{ marginTop: 28 }}>
          <button className="subj-btn subj-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="subj-btn subj-btn--danger" onClick={handleConfirm} disabled={loading}>
            {loading ? "A eliminar…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── SubjectCard ─────────────────────────────────────────────── */
interface CardProps {
  subject: Subject;
  onEdit: (s: Subject) => void;
  onDelete: (s: Subject) => void;
  animDelay: number;
}

function SubjectCard({ subject, onEdit, onDelete, animDelay }: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const progressPct = subject.objetivoSemanalHoras > 0
    ? Math.min(100, (0 / subject.objetivoSemanalHoras) * 100)
    : 0;

  return (
    <div className="subj-card" style={{ animationDelay: `${animDelay * 0.06}s` }}>
      <div className="subj-card__top" style={{ background: subject.cor }} />
      <div className="subj-card__body">
        <div className="subj-card__head">
          <span className="subj-card__name">{subject.nome}</span>
          <div className="subj-card__menu" ref={menuRef}>
            <button
              className="subj-card__menu-btn"
              onClick={() => setMenuOpen(v => !v)}
              type="button"
              aria-label="Opções"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="3" r="1.2" fill="currentColor"/>
                <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
                <circle cx="8" cy="13" r="1.2" fill="currentColor"/>
              </svg>
            </button>
            {menuOpen && (
              <div className="subj-card__dropdown">
                <button
                  className="subj-card__dropdown-item"
                  onClick={() => { onEdit(subject); setMenuOpen(false); }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                  Editar
                </button>
                <button
                  className="subj-card__dropdown-item subj-card__dropdown-item--danger"
                  onClick={() => { onDelete(subject); setMenuOpen(false); }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M6 4V2h4v2M13 4l-.8 10H3.8L3 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="subj-card__meta">
          {subject.creditos > 0 && (
            <span className="subj-badge subj-badge--creditos">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M6 3.5v3l2 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              {subject.creditos} ECTS
            </span>
          )}
          <span className={`subj-badge subj-badge--${subject.prioridade}`}>
            {subject.prioridade === "baixa" ? "🟢" : subject.prioridade === "media" ? "🟡" : "🔴"}
            {" "}{PRIORITY_LABELS[subject.prioridade]}
          </span>
        </div>

        {subject.objetivoSemanalHoras > 0 && (
          <div className="subj-card__goal">
            <div className="subj-card__goal-label">
              Objetivo semanal
              <span>0h / {subject.objetivoSemanalHoras}h</span>
            </div>
            <div className="subj-card__progress">
              <div
                className="subj-card__progress-bar"
                style={{ width: `${progressPct}%`, background: subject.cor }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── SubjectsPage ────────────────────────────────────────────── */
export default function SubjectsPage({ onNavigate }: Props) {
  const { user, handleLogout } = useAuth();
  const { subjects, loading, error, addSubject, editSubject, removeSubject } = useSubjects();

  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<"all" | "baixa" | "media" | "alta">("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const filtered = subjects.filter(s => {
    const matchSearch = s.nome.toLowerCase().includes(search.toLowerCase());
    const matchPriority = filterPriority === "all" || s.prioridade === filterPriority;
    return matchSearch && matchPriority;
  });

  const totalEcts = subjects.reduce((acc, s) => acc + s.creditos, 0);
  const totalObjetivo = subjects.reduce((acc, s) => acc + s.objetivoSemanalHoras, 0);

  return (
    <div className="subj-root">
      {/* Particles */}
      <div className="subj-particles">
        {[...Array(12)].map((_, i) => (
          <span key={i} className="subj-particle" style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>

      <Navbar
        activePage="subjects"
        onNavigate={onNavigate}
        userName={user?.nome}
        onLogout={handleLogout}
      />

      {/* Main */}
      <main className="subj-main">

        {/* Header */}
        <div className="subj-header">
          <div className="subj-header__left">
            <p className="subj-header__eyebrow">As tuas cadeiras</p>
            <h1 className="subj-header__title">
              Disciplinas <span>✦</span>
            </h1>
            <p className="subj-header__sub">
              Organiza e acompanha todas as tuas cadeiras do semestre.
            </p>
          </div>
          <button className="subj-add-btn" onClick={() => { setEditTarget(null); setShowForm(true); }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Nova disciplina
          </button>
        </div>

        {/* Stats */}
        <div className="subj-stats">
          <div className="subj-stat">
            <div className="subj-stat__icon">📚</div>
            <div className="subj-stat__info">
              <div className="subj-stat__value">{subjects.length}</div>
              <div className="subj-stat__label">Disciplinas ativas</div>
            </div>
          </div>
          <div className="subj-stat">
            <div className="subj-stat__icon">🎓</div>
            <div className="subj-stat__info">
              <div className="subj-stat__value">{totalEcts}</div>
              <div className="subj-stat__label">Créditos ECTS totais</div>
            </div>
          </div>
          <div className="subj-stat">
            <div className="subj-stat__icon">🎯</div>
            <div className="subj-stat__info">
              <div className="subj-stat__value">{totalObjetivo}h</div>
              <div className="subj-stat__label">Objetivo semanal total</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="subj-toolbar">
          <div className="subj-search">
            <svg className="subj-search__icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text" placeholder="Pesquisar disciplina…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="subj-filter">
            {(["all", "baixa", "media", "alta"] as const).map(p => (
              <button
                key={p}
                className={`subj-filter__btn ${filterPriority === p ? "subj-filter__btn--active" : ""}`}
                onClick={() => setFilterPriority(p)}
              >
                {p === "all" ? "Todas" : PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="subj-grid">
          {loading && (
            <div className="subj-loading">
              <div className="subj-spinner" />
            </div>
          )}
          {!loading && error && (
            <div className="subj-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="subj-empty">
              <div className="subj-empty__icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M6 8h20M6 14h20M6 20h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              {search || filterPriority !== "all" ? (
                <>
                  <p>Nenhuma disciplina encontrada.</p>
                  <p className="subj-empty__sub">Tenta ajustar a pesquisa ou os filtros.</p>
                </>
              ) : (
                <>
                  <p>Ainda não tens disciplinas.</p>
                  <p className="subj-empty__sub">Clica em "Nova disciplina" para começar.</p>
                </>
              )}
            </div>
          )}
          {!loading && filtered.map((s, i) => (
            <SubjectCard
              key={s.id}
              subject={s}
              animDelay={i}
              onEdit={sub => { setEditTarget(sub); setShowForm(true); }}
              onDelete={sub => setDeleteTarget(sub)}
            />
          ))}
        </div>
      </main>

      {/* Form modal */}
      {showForm && (
        <SubjectFormModal
          initial={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSave={async payload => {
            if (editTarget) await editSubject(editTarget.id, payload);
            else await addSubject(payload);
          }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDeleteModal
          subject={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => removeSubject(deleteTarget.id)}
        />
      )}
    </div>
  );
}
