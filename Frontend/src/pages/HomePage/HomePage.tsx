import { useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useSessions } from "../../hooks/useSessions";
import { useSubjects } from "../../hooks/useSubjects";
import { useExams } from "../../hooks/useExams";
import Navbar from "../../components/ui/Navbar/Navbar";
import type { Subject } from "../../types/subject.types";
import type { Session } from "../../types/session.types";
import "./HomePage.css";

interface Props { onNavigate: (page: string) => void; }

/* ── helpers ─────────────────────────────────────────────── */
function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  };
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr + "T00:00:00").getTime() - today.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function minutesToHours(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function streakCount(sessions: Session[]): number {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map(s => s.data));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if (days.has(key)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function urgencyClass(days: number) {
  if (days === 0) return "today";
  if (days <= 3) return "urgent";
  if (days <= 7) return "soon";
  return "ok";
}

/* ── sub-components ──────────────────────────────────────── */
function StatCard({ icon, value, label, accent }: {
  icon: string; value: string; label: string; accent?: boolean;
}) {
  return (
    <div className={`home-stat-card${accent ? " home-stat-card--accent" : ""}`}>
      <span className="home-stat-card__icon">{icon}</span>
      <span className="home-stat-card__value">{value}</span>
      <span className="home-stat-card__label">{label}</span>
    </div>
  );
}

function SubjectProgressBar({ subject, minutesStudied }: {
  subject: Subject; minutesStudied: number;
}) {
  const goalMinutes = subject.objetivoSemanalHoras * 60;
  const pct = goalMinutes > 0 ? Math.min(100, Math.round((minutesStudied / goalMinutes) * 100)) : 0;
  const low = minutesStudied < goalMinutes * 0.3 && goalMinutes > 0;
  return (
    <div className="home-subject-row">
      <div className="home-subject-row__info">
        <span className="home-subject-row__dot" style={{ background: subject.cor }} />
        <span className="home-subject-row__name">{subject.nome}</span>
        <span className="home-subject-row__time">{minutesToHours(minutesStudied)}</span>
        <span className="home-subject-row__goal">/ {subject.objetivoSemanalHoras}h</span>
      </div>
      <div className="home-subject-row__bar-track">
        <div
          className={`home-subject-row__bar-fill${low ? " home-subject-row__bar-fill--low" : ""}`}
          style={{ width: `${pct}%`, background: low ? undefined : subject.cor }}
        />
      </div>
      <span className="home-subject-row__pct">{pct}%</span>
    </div>
  );
}

function RecentSessionItem({ session, subject }: { session: Session; subject?: Subject }) {
  return (
    <div className="home-session-item">
      <div className="home-session-item__dot" style={{ background: subject?.cor ?? "#7eb8f7" }} />
      <div className="home-session-item__body">
        <span className="home-session-item__subject">{subject?.nome ?? "—"}</span>
        <span className="home-session-item__meta">
          {minutesToHours(session.duracaoMinutos)} · {formatDate(session.data)}
        </span>
      </div>
      <span className="home-session-item__foco">
        {"★".repeat(session.foco)}{"☆".repeat(5 - session.foco)}
      </span>
    </div>
  );
}

function ExamCountdownItem({ exam, subject, onNavigate }: {
  exam: { id: string; titulo: string; data: string; subjectId: string };
  subject?: Subject;
  onNavigate: (p: string) => void;
}) {
  const days = daysUntil(exam.data);
  const urg = urgencyClass(days);
  const label = days === 0 ? "Hoje!" : days === 1 ? "Amanhã" : `${days} dias`;
  return (
    <div className={`home-exam-item home-exam-item--${urg}`} onClick={() => onNavigate("exams")}>
      <div className="home-exam-item__left">
        <span className="home-exam-item__dot" style={{ background: subject?.cor ?? "#7eb8f7" }} />
        <div>
          <span className="home-exam-item__title">{exam.titulo}</span>
          <span className="home-exam-item__sub">{subject?.nome ?? "—"} · {formatDate(exam.data)}</span>
        </div>
      </div>
      <span className={`home-exam-item__badge home-exam-item__badge--${urg}`}>{label}</span>
    </div>
  );
}

/* ── main ────────────────────────────────────────────────── */
export default function HomePage({ onNavigate }: Props) {
  const { user, handleLogout } = useAuth();

  // ✅ Single fetch — all sessions, no server-side filters, no Firestore composite index needed
  const { sessions, loading: sessionsLoading } = useSessions();
  const { subjects } = useSubjects();
  const { upcoming: upcomingExams } = useExams();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  // stable week bounds (computed once per render cycle, not per re-render)
  const week = useMemo(() => getWeekBounds(), []);

  // filter sessions to current week entirely in memory
  const weekSessions = useMemo(
    () => sessions.filter(s => s.data >= week.start && s.data <= week.end),
    [sessions, week.start, week.end]
  );

  const streak = useMemo(() => streakCount(sessions), [sessions]);

  // week stats computed in memory — no second API call, no index issues
  const weekStats = useMemo(() => {
    if (!weekSessions.length) return null;
    const totalMinutos = weekSessions.reduce((a, s) => a + s.duracaoMinutos, 0);
    const mediaFoco = weekSessions.reduce((a, s) => a + s.foco, 0) / weekSessions.length;
    const humores = weekSessions.filter(s => s.humor !== null).map(s => s.humor as number);
    const mediaHumor = humores.length ? humores.reduce((a, v) => a + v, 0) / humores.length : null;
    const minutosPorDisciplina: Record<string, number> = {};
    for (const s of weekSessions) {
      minutosPorDisciplina[s.subjectId] = (minutosPorDisciplina[s.subjectId] ?? 0) + s.duracaoMinutos;
    }
    return { totalMinutos, totalSessoes: weekSessions.length, mediaFoco, mediaHumor, minutosPorDisciplina };
  }, [weekSessions]);

  const horasSemanais = weekStats ? minutesToHours(weekStats.totalMinutos) : "0h";
  const nextExam = upcomingExams[0] ?? null;
  const nextExamLabel = nextExam
    ? (daysUntil(nextExam.data) === 0 ? "Hoje!" : `${daysUntil(nextExam.data)}d`)
    : "—";

  const minutesBySubject = weekStats?.minutosPorDisciplina ?? {};

  const subjectsByActivity = useMemo(
    () => [...subjects].sort((a, b) => (minutesBySubject[b.id] ?? 0) - (minutesBySubject[a.id] ?? 0)).slice(0, 5),
    [subjects, minutesBySubject]
  );

  const neglectedSubject = useMemo(
    () => subjects.find(s => {
      const goal = s.objetivoSemanalHoras * 60;
      return goal > 0 && (minutesBySubject[s.id] ?? 0) < goal * 0.2;
    }),
    [subjects, minutesBySubject]
  );

  const recentSessions = useMemo(
    () => [...sessions].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5),
    [sessions]
  );

  const next3Exams = upcomingExams.slice(0, 3);
  const hasAnyData = sessions.length > 0 || subjects.length > 0;

  return (
    <div className="home-root">
      <div className="home-particles">
        {[...Array(14)].map((_, i) => (
          <span key={i} className="home-particle" style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>

      <Navbar activePage="home" onNavigate={onNavigate} userName={user?.nome} onLogout={handleLogout} />

      <main className="home-main">

        {/* ── Hero ── */}
        <section className="home-hero">
          <p className="home-hero__greeting">{greeting},</p>
          <h1 className="home-hero__title">
            {user?.nome?.split(" ")[0] ?? "Estudante"} <span>✦</span>
          </h1>
          <p className="home-hero__sub">
            {streak > 0
              ? `${streak} dia${streak > 1 ? "s" : ""} consecutivo${streak > 1 ? "s" : ""} a estudar 🔥 Continua assim!`
              : "Pronto para entrar no fluxo hoje?"}
          </p>
        </section>

        {/* ── Stats row ── */}
        <section className="home-stats">
          <StatCard icon="⏱" value={sessionsLoading ? "…" : horasSemanais} label="Horas esta semana" />
          <StatCard icon="📚" value={String(subjects.length)} label="Disciplinas ativas" />
          <StatCard
            icon="📝"
            value={nextExamLabel}
            label="Próximo exame"
            accent={!!nextExam && daysUntil(nextExam.data) <= 3}
          />
          <StatCard
            icon="🔥"
            value={sessionsLoading ? "…" : (streak > 0 ? `${streak} dias` : "0 dias")}
            label="Sequência atual"
            accent={streak >= 3}
          />
        </section>

        {/* ── Alert banner ── */}
        {neglectedSubject && (
          <div className="home-alert" onClick={() => onNavigate("sessions")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#f59e0b" strokeWidth="1.4"/>
              <path d="M8 5v3.5M8 11h.01" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>
              <strong>{neglectedSubject.nome}</strong> está a ser negligenciada — menos de 20% do objetivo semanal atingido.
            </span>
            <span className="home-alert__cta">Estudar agora →</span>
          </div>
        )}

        {/* ── Content ── */}
        {sessionsLoading ? (
          <div className="home-loading">
            <div className="home-spinner" />
          </div>
        ) : hasAnyData ? (
          <div className="home-columns">

            {/* LEFT col */}
            <div className="home-col">
              <h2 className="home-section-title">Progresso semanal por disciplina</h2>
              {subjectsByActivity.length > 0 ? (
                <div className="home-card">
                  {subjectsByActivity.map(s => (
                    <SubjectProgressBar
                      key={s.id}
                      subject={s}
                      minutesStudied={minutesBySubject[s.id] ?? 0}
                    />
                  ))}
                  {weekStats && (
                    <div className="home-focus-row">
                      <span className="home-focus-row__label">Foco médio esta semana</span>
                      <div className="home-focus-stars">
                        {[1,2,3,4,5].map(n => (
                          <span key={n} className={`home-focus-star${weekStats.mediaFoco >= n ? " home-focus-star--on" : ""}`}>★</span>
                        ))}
                        <span className="home-focus-num">{weekStats.mediaFoco.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="home-card home-card--empty">
                  <p>Sem disciplinas criadas ainda.</p>
                  <button className="home-mini-btn" onClick={() => onNavigate("subjects")}>Criar disciplina</button>
                </div>
              )}

              {weekStats && weekStats.totalSessoes > 0 && (
                <div className="home-mini-stats">
                  <div className="home-mini-stat">
                    <span className="home-mini-stat__val">{weekStats.totalSessoes}</span>
                    <span className="home-mini-stat__lbl">Sessões</span>
                  </div>
                  <div className="home-mini-stat">
                    <span className="home-mini-stat__val">{minutesToHours(weekStats.totalMinutos)}</span>
                    <span className="home-mini-stat__lbl">Total</span>
                  </div>
                  {weekStats.mediaHumor !== null && (
                    <div className="home-mini-stat">
                      <span className="home-mini-stat__val">{weekStats.mediaHumor.toFixed(1)}</span>
                      <span className="home-mini-stat__lbl">Humor médio</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT col */}
            <div className="home-col">
              <h2 className="home-section-title">Exames próximos</h2>
              <div className="home-card">
                {next3Exams.length > 0 ? (
                  next3Exams.map(exam => (
                    <ExamCountdownItem
                      key={exam.id}
                      exam={exam}
                      subject={subjects.find(s => s.id === exam.subjectId)}
                      onNavigate={onNavigate}
                    />
                  ))
                ) : (
                  <div className="home-card--empty-inline">
                    <span>Nenhum exame marcado.</span>
                    <button className="home-mini-btn" onClick={() => onNavigate("exams")}>Marcar exame</button>
                  </div>
                )}
                {upcomingExams.length > 3 && (
                  <button className="home-see-more" onClick={() => onNavigate("exams")}>
                    Ver todos ({upcomingExams.length}) →
                  </button>
                )}
              </div>

              <h2 className="home-section-title" style={{ marginTop: 28 }}>Sessões recentes</h2>
              <div className="home-card">
                {recentSessions.length > 0 ? (
                  recentSessions.map(s => (
                    <RecentSessionItem
                      key={s.id}
                      session={s}
                      subject={subjects.find(sub => sub.id === s.subjectId)}
                    />
                  ))
                ) : (
                  <div className="home-card--empty-inline">
                    <span>Sem sessões registadas.</span>
                    <button className="home-mini-btn" onClick={() => onNavigate("sessions")}>Registar sessão</button>
                  </div>
                )}
                {sessions.length > 5 && (
                  <button className="home-see-more" onClick={() => onNavigate("sessions")}>
                    Ver todas →
                  </button>
                )}
              </div>
            </div>

          </div>
        ) : (
          <section className="home-empty">
            <div className="home-empty__inner">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity=".35">
                <circle cx="24" cy="24" r="22" stroke="#7EB8F7" strokeWidth="1.5"/>
                <path d="M14 24 Q19 16 24 24 Q29 32 34 24" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <circle cx="24" cy="24" r="3" fill="#7EB8F7"/>
              </svg>
              <p>Nenhuma atividade ainda.</p>
              <p className="home-empty__sub">Cria a tua primeira sessão de estudo para começar.</p>
            </div>
          </section>
        )}

        {/* ── Quick actions ── */}
        <section className="home-actions">
          <h2 className="home-section-title">Acesso rápido</h2>
          <div className="home-action-grid">
            {[
              {
                title: "Nova sessão", desc: "Regista tempo de estudo", route: "sessions",
                icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M11 7v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
              },
              {
                title: "Disciplinas", desc: "Organiza as tuas cadeiras", route: "subjects",
                icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 6h14M4 11h14M4 16h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
              },
              {
                title: "Marcar exame", desc: "Prepara-te com antecedência", route: "exams",
                icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="4" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M3 9h16M8 2v4M14 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
              },
              {
                title: "Perguntar à IA", desc: "O teu copiloto de estudo", route: "ai",
                icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2C6 2 2 5.6 2 10c0 2 .8 3.8 2 5.2V20l4-2.5c1 .3 2 .5 3 .5 5 0 9-3.6 9-8s-4-8-9-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
              },
            ].map(action => (
              <button key={action.title} className="home-action-card" onClick={() => onNavigate(action.route)}>
                <span className="home-action-card__icon">{action.icon}</span>
                <span className="home-action-card__title">{action.title}</span>
                <span className="home-action-card__desc">{action.desc}</span>
              </button>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
