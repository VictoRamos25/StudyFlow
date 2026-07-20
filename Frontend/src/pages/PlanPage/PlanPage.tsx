import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useAuthContext } from "../../context/AuthContext";
import Navbar from "../../components/ui/Navbar/Navbar";
import { generatePlan, downloadPlanPdf } from "../../services/PlanApi";
import type { StudyPlan, PlanDay, PlanDayBlock } from "../../types/plan.types";
import "./PlanPage.css";

interface Props { onNavigate: (page: string) => void; }

/* ── helpers ──────────────────────────────────────────────── */
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

function horasLabel(h: number): string {
  const min = Math.round(h * 60);
  return minutesToHours(min);
}

/* ── sub-components ───────────────────────────────────────── */
function BlockCard({ block }: { block: PlanDayBlock }) {
  return (
    <div className="plan-block" style={{ "--block-color": block.cor } as React.CSSProperties}>
      <div className="plan-block__accent" />
      <div className="plan-block__body">
        <div className="plan-block__header">
          <span className="plan-block__subject">{block.disciplina}</span>
          <span className="plan-block__duration">{horasLabel(block.horas)}</span>
        </div>
        {block.descricao && (
          <p className="plan-block__desc">{block.descricao}</p>
        )}
      </div>
    </div>
  );
}

function DayColumn({ day, index }: { day: PlanDay; index: number }) {
  const isToday = day.data === new Date().toISOString().split("T")[0];
  return (
    <div
      className={`plan-day${isToday ? " plan-day--today" : ""}${day.blocos.length === 0 ? " plan-day--rest" : ""}`}
      style={{ "--delay": `${index * 0.07}s` } as React.CSSProperties}
    >
      <div className="plan-day__header">
        <span className="plan-day__weekday">{day.diaSemana.slice(0, 3).toUpperCase()}</span>
        <span className="plan-day__date">{formatDate(day.data)}</span>
        {isToday && <span className="plan-day__today-badge">Hoje</span>}
        {day.totalMinutos > 0 && (
          <span className="plan-day__total">{minutesToHours(day.totalMinutos)}</span>
        )}
      </div>

      <div className="plan-day__blocks">
        {day.blocos.length === 0 ? (
          <div className="plan-day__rest-label">
            <span>✦</span>
            <span>Descanso</span>
          </div>
        ) : (
          day.blocos.map((block, i) => (
            <BlockCard key={i} block={block} />
          ))
        )}
      </div>
    </div>
  );
}

function SummaryBar({ plan }: { plan: StudyPlan }) {
  const diasComEstudo = plan.dias.filter(d => d.blocos.length > 0).length;
  const totalMin = plan.dias.reduce((acc, d) => acc + d.totalMinutos, 0);

  return (
    <div className="plan-summary">
      <div className="plan-summary__stat">
        <span className="plan-summary__val">{minutesToHours(totalMin)}</span>
        <span className="plan-summary__lbl">Total planeado</span>
      </div>
      <div className="plan-summary__divider" />
      <div className="plan-summary__stat">
        <span className="plan-summary__val">{diasComEstudo}</span>
        <span className="plan-summary__lbl">Dias de estudo</span>
      </div>
      <div className="plan-summary__divider" />
      <div className="plan-summary__stat">
        <span className="plan-summary__val">{plan.dias.reduce((acc, d) => acc + d.blocos.length, 0)}</span>
        <span className="plan-summary__lbl">Blocos criados</span>
      </div>
      {plan.proximoExame && (
        <>
          <div className="plan-summary__divider" />
          <div className="plan-summary__stat">
            <span className="plan-summary__val plan-summary__val--exam">
              {plan.diasAteExame === 0 ? "Hoje" : `${plan.diasAteExame}d`}
            </span>
            <span className="plan-summary__lbl">para {plan.proximoExame}</span>
          </div>
        </>
      )}
    </div>
  );
}

/* ── main page ────────────────────────────────────────────── */
export default function PlanPage({ onNavigate }: Props) {
  const { user, handleLogout } = useAuth();
  const { user: authUser } = useAuthContext();

  const [plan, setPlan]           = useState<StudyPlan | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError]   = useState("");

  const handleGenerate = async () => {
    if (!authUser?.token || loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await generatePlan(authUser.token);
      setPlan(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar o plano.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!authUser?.token || pdfLoading) return;
    setPdfLoading(true);
    setPdfError("");
    try {
      await downloadPlanPdf(authUser.token);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Erro ao gerar o PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  const firstName = user?.nome?.split(" ")[0] ?? "Estudante";

  return (
    <div className="plan-root">
      {/* background particles */}
      <div className="plan-particles">
        {[...Array(10)].map((_, i) => (
          <span key={i} className="plan-particle" style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>

      <Navbar
        activePage="plan"
        onNavigate={onNavigate}
        userName={user?.nome}
        onLogout={handleLogout}
      />

      <main className="plan-main">

        {/* ── Hero header ─────────────────────────────────── */}
        <div className="plan-hero">
          <div className="plan-hero__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="3"
                stroke="url(#plan-g)" strokeWidth="1.5"/>
              <path d="M3 9h18M8 2v4M16 2v4M7 13h4M7 17h6"
                stroke="url(#plan-g)" strokeWidth="1.5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="plan-g" x1="3" y1="4" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7EB8F7"/><stop offset="1" stopColor="#A78BFA"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1 className="plan-hero__title">
              Plano de Estudo <span>Semanal</span>
            </h1>
            <p className="plan-hero__sub">
              A IA analisa os teus exames, disciplinas e histórico de sessões
              e distribui automaticamente as horas mais inteligentes para esta semana.
            </p>
          </div>
        </div>

        {/* ── Generate button ──────────────────────────────── */}
        {!plan && !loading && (
          <div className="plan-cta">
            <div className="plan-cta__card">
              <div className="plan-cta__orbs">
                <span className="plan-cta__orb plan-cta__orb--1" />
                <span className="plan-cta__orb plan-cta__orb--2" />
              </div>
              <h2 className="plan-cta__heading">Pronto para esta semana, {firstName}?</h2>
              <p className="plan-cta__text">
                O agente vai calcular um plano personalizado com base nos teus exames
                futuros, no tempo que tens disponível e nas disciplinas que mais precisam
                de atenção.
              </p>
              <ul className="plan-cta__bullets">
                <li>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3.5" stroke="#7EB8F7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Prioriza disciplinas com exames próximos
                </li>
                <li>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3.5" stroke="#7EB8F7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Equilibra horas com base nos teus objetivos semanais
                </li>
                <li>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3.5" stroke="#7EB8F7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Inclui dias de descanso estratégico
                </li>
              </ul>
              <button className="plan-generate-btn" onClick={handleGenerate}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                </svg>
                Gerar Plano com IA
              </button>
            </div>
          </div>
        )}

        {/* ── Loading state ────────────────────────────────── */}
        {loading && (
          <div className="plan-loading">
            <div className="plan-loading__ring">
              <span />
            </div>
            <p className="plan-loading__title">A construir o teu plano…</p>
            <p className="plan-loading__sub">
              O agente está a analisar os teus exames, sessões e objetivos
            </p>
            <div className="plan-loading__steps">
              {["A verificar exames próximos", "A calcular horas em falta", "A distribuir os blocos"].map((s, i) => (
                <div key={i} className="plan-loading__step" style={{ "--step-i": i } as React.CSSProperties}>
                  <div className="plan-loading__step-dot" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Error state ──────────────────────────────────── */}
        {error && !loading && (
          <div className="plan-error">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            {error}
            <button className="plan-error__retry" onClick={handleGenerate}>Tentar novamente</button>
          </div>
        )}

        {/* ── Plan result ──────────────────────────────────── */}
        {plan && !loading && (
          <div className="plan-result">

            {/* IA message */}
            {plan.mensagemIA && (
              <div className="plan-ai-msg">
                <div className="plan-ai-msg__avatar">
                  <svg width="15" height="15" viewBox="0 0 22 22" fill="none">
                    <path d="M11 2C6 2 2 5.6 2 10c0 2 .8 3.8 2 5.2V20l4-2.5c1 .3 2 .5 3 .5 5 0 9-3.6 9-8s-4-8-9-8z"
                      stroke="url(#plan-ai-g)" strokeWidth="1.5" strokeLinejoin="round"/>
                    <defs>
                      <linearGradient id="plan-ai-g" x1="2" y1="2" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#7EB8F7"/><stop offset="1" stopColor="#A78BFA"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <p>{plan.mensagemIA}</p>
              </div>
            )}

            {/* Summary bar */}
            <SummaryBar plan={plan} />

            {/* Days grid */}
            <div className="plan-grid">
              {plan.dias.map((day, i) => (
                <DayColumn key={day.data} day={day} index={i} />
              ))}
            </div>

            {/* Action row — Regenerar + Guardar PDF */}
            <div className="plan-regen-row">
              <button className="plan-regen-btn" onClick={handleGenerate}>
                <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                  <path d="M1 9a8 8 0 0114.32-3.6M17 9a8 8 0 01-14.32 3.6M1 5.4V9h3.6M17 12.6V9h-3.6"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Regenerar plano
              </button>

              <button
                className="plan-pdf-btn"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
              >
                {pdfLoading ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="plan-pdf-btn__spinner">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10"/>
                    </svg>
                    A gerar PDF…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3v13M7 11l5 5 5-5M3 21h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Guardar PDF
                  </>
                )}
              </button>
            </div>

            {/* PDF error */}
            {pdfError && (
              <div className="plan-error" style={{ marginTop: "0.5rem" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                {pdfError}
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
