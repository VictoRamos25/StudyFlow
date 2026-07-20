import { useState, useEffect, useRef, useCallback } from "react";
import type { Subject } from "../../types/subject.types";
import "./PomodoroTimer.css";

/* ── Types ───────────────────────────────────────────────────── */
type Phase = "focus" | "short_break" | "long_break";

interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLong: number;
}

interface PomodoroTimerProps {
  subjects: Subject[];
  onClose: () => void;
  /** Chamado quando o utilizador termina a sessão e quer guardar */
  onSaveSession: (payload: {
    subjectId: string;
    duracaoMinutos: number;
    pomodorosConcluidos: number;
    tipo: "pomodoro";
  }) => void;
}

/* ── Defaults ────────────────────────────────────────────────── */
const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLong: 4,
};

const PHASE_LABELS: Record<Phase, string> = {
  focus: "🎯 Foco",
  short_break: "☕ Pausa curta",
  long_break: "🛋️ Pausa longa",
};

const PHASE_COLORS: Record<Phase, string> = {
  focus: "#7EB8F7",
  short_break: "#34D399",
  long_break: "#A78BFA",
};

/* ── Helpers ─────────────────────────────────────────────────── */
function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatMMSS(seconds: number) {
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

/* ── Component ───────────────────────────────────────────────── */
export default function PomodoroTimer({ subjects, onClose, onSaveSession }: PomodoroTimerProps) {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id ?? "");

  const [phase, setPhase] = useState<Phase>("focus");
  const [cycle, setCycle] = useState(1); // ciclo atual
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);

  const phaseSeconds = useCallback(
    (p: Phase) => {
      if (p === "focus") return settings.focusMinutes * 60;
      if (p === "short_break") return settings.shortBreakMinutes * 60;
      return settings.longBreakMinutes * 60;
    },
    [settings]
  );

  const [secondsLeft, setSecondsLeft] = useState(phaseSeconds("focus"));
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false); // sessão terminada (para mostrar resumo)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  // Sincroniza o timer quando as settings mudam (apenas se parado)
  useEffect(() => {
    if (!running) {
      setSecondsLeft(phaseSeconds(phase));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  /* ── Tick ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          handlePhaseEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase]);

  /* ── Phase transitions ────────────────────────────────────── */
  function handlePhaseEnd() {
    playBell();
    setRunning(false);

    if (phase === "focus") {
      const newCompleted = completedPomodoros + 1;
      setCompletedPomodoros(newCompleted);
      setTotalFocusMinutes(prev => prev + settings.focusMinutes);

      const isLongBreak = newCompleted % settings.cyclesBeforeLong === 0;
      const nextPhase: Phase = isLongBreak ? "long_break" : "short_break";
      setPhase(nextPhase);
      setSecondsLeft(phaseSeconds(nextPhase));
      setCycle(prev => prev + 1);
    } else {
      // Fim da pausa → volta ao foco
      setPhase("focus");
      setSecondsLeft(phaseSeconds("focus"));
    }
  }

  function goToNextPhase() {
    clearInterval(intervalRef.current!);
    setRunning(false);
    handlePhaseEnd();
  }

  function resetTimer() {
    clearInterval(intervalRef.current!);
    setRunning(false);
    setPhase("focus");
    setCycle(1);
    setCompletedPomodoros(0);
    setTotalFocusMinutes(0);
    setSecondsLeft(phaseSeconds("focus"));
    setFinished(false);
  }

  /* ── Bell sound (Web Audio API) ──────────────────────────── */
  function playBell() {
    try {
      const ctx = new AudioContext();
      audioRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch {
      // silently ignore if AudioContext isn't available
    }
  }

  /* ── Save session ─────────────────────────────────────────── */
  function handleFinish() {
    if (completedPomodoros === 0 && totalFocusMinutes === 0) {
      onClose();
      return;
    }
    setFinished(true);
  }

  function handleSave() {
    onSaveSession({
      subjectId: selectedSubject,
      duracaoMinutos: totalFocusMinutes,
      pomodorosConcluidos: completedPomodoros,
      tipo: "pomodoro",
    });
    onClose();
  }

  /* ── Progress ring ────────────────────────────────────────── */
  const total = phaseSeconds(phase);
  const progress = total > 0 ? (total - secondsLeft) / total : 0;
  const circumference = 2 * Math.PI * 110;
  const dashOffset = circumference * (1 - progress);
  const color = PHASE_COLORS[phase];

  /* ── Settings panel ───────────────────────────────────────── */
  function SettingsPanel() {
    const [local, setLocal] = useState(settings);
    return (
      <div className="pomo-settings-panel">
        <h3 className="pomo-settings__title">⚙️ Configurações</h3>
        <div className="pomo-settings__grid">
          {[
            { label: "Foco (min)", key: "focusMinutes" as const },
            { label: "Pausa curta (min)", key: "shortBreakMinutes" as const },
            { label: "Pausa longa (min)", key: "longBreakMinutes" as const },
            { label: "Ciclos p/ pausa longa", key: "cyclesBeforeLong" as const },
          ].map(({ label, key }) => (
            <div className="pomo-settings__field" key={key}>
              <label>{label}</label>
              <input
                type="number"
                min={1}
                max={60}
                value={local[key]}
                onChange={e => setLocal(prev => ({ ...prev, [key]: Number(e.target.value) }))}
              />
            </div>
          ))}
        </div>
        <div className="pomo-settings__actions">
          <button className="pomo-btn pomo-btn--ghost" onClick={() => setShowSettings(false)}>
            Cancelar
          </button>
          <button
            className="pomo-btn pomo-btn--primary"
            onClick={() => {
              setSettings(local);
              setShowSettings(false);
              // reset to new focus duration if stopped
              if (!running) {
                setPhase("focus");
                setSecondsLeft(local.focusMinutes * 60);
              }
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    );
  }

  /* ── Finished summary ────────────────────────────────────── */
  if (finished) {
    return (
      <div className="pomo-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="pomo-modal pomo-modal--summary">
          <div className="pomo-summary__icon">🍅</div>
          <h2 className="pomo-summary__title">Sessão concluída!</h2>
          <p className="pomo-summary__sub">Excelente trabalho. Aqui está o teu resumo:</p>

          <div className="pomo-summary__stats">
            <div className="pomo-summary__stat">
              <span className="pomo-summary__stat-value">{completedPomodoros}</span>
              <span className="pomo-summary__stat-label">Pomodoros</span>
            </div>
            <div className="pomo-summary__stat">
              <span className="pomo-summary__stat-value">{totalFocusMinutes}m</span>
              <span className="pomo-summary__stat-label">Tempo de foco</span>
            </div>
          </div>

          <div className="pomo-field">
            <label>Disciplina</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
              {subjects.length === 0 && <option value="">Sem disciplinas</option>}
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>

          <div className="pomo-summary__actions">
            <button className="pomo-btn pomo-btn--ghost" onClick={onClose}>
              Descartar
            </button>
            <button
              className="pomo-btn pomo-btn--primary"
              onClick={handleSave}
              disabled={!selectedSubject}
            >
              💾 Guardar sessão
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main timer ───────────────────────────────────────────── */
  return (
    <div className="pomo-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pomo-modal">

        {/* Header */}
        <div className="pomo-header">
          <span className="pomo-phase-badge" style={{ color }}>
            {PHASE_LABELS[phase]}
          </span>
          <div className="pomo-header__right">
            <button
              className="pomo-icon-btn"
              title="Configurações"
              onClick={() => setShowSettings(s => !s)}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="pomo-icon-btn" title="Fechar" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {showSettings && <SettingsPanel />}

        {!showSettings && (
          <>
            {/* Subject selector */}
            <div className="pomo-field pomo-field--subject">
              <label>Disciplina</label>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                {subjects.length === 0 && <option value="">Sem disciplinas</option>}
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>

            {/* Progress ring */}
            <div className="pomo-ring-wrap">
              <svg className="pomo-ring" viewBox="0 0 240 240" width="240" height="240">
                <circle
                  cx="120" cy="120" r="110"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="8"
                />
                <circle
                  cx="120" cy="120" r="110"
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 120 120)"
                  style={{ transition: "stroke-dashoffset 0.95s linear, stroke 0.4s" }}
                />
              </svg>
              <div className="pomo-ring__center">
                <div className="pomo-ring__time" style={{ color }}>
                  {formatMMSS(secondsLeft)}
                </div>
                <div className="pomo-ring__cycle">
                  Ciclo {cycle}
                </div>
              </div>
            </div>

            {/* Pomodoro dots */}
            <div className="pomo-dots">
              {Array.from({ length: settings.cyclesBeforeLong }).map((_, i) => (
                <span
                  key={i}
                  className={`pomo-dot ${i < (completedPomodoros % settings.cyclesBeforeLong || (completedPomodoros > 0 && completedPomodoros % settings.cyclesBeforeLong === 0 ? settings.cyclesBeforeLong : 0)) ? "pomo-dot--done" : ""}`}
                />
              ))}
            </div>

            <div className="pomo-stats-row">
              <span>🍅 {completedPomodoros} pomodoros</span>
              <span>⏱ {totalFocusMinutes}min de foco</span>
            </div>

            {/* Controls */}
            <div className="pomo-controls">
              <button
                className="pomo-btn pomo-btn--ghost pomo-btn--icon"
                title="Reiniciar"
                onClick={resetTimer}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10a6 6 0 106-6H7M7 4L4 7l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <button
                className="pomo-btn pomo-btn--primary pomo-btn--play"
                onClick={() => setRunning(r => !r)}
                style={{ background: `linear-gradient(135deg, ${color} 0%, #A78BFA 100%)` }}
              >
                {running ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <rect x="5" y="4" width="3.5" height="12" rx="1.5"/>
                    <rect x="11.5" y="4" width="3.5" height="12" rx="1.5"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6 4.5l10 5.5-10 5.5V4.5z"/>
                  </svg>
                )}
                {running ? "Pausar" : secondsLeft === phaseSeconds(phase) ? "Iniciar" : "Retomar"}
              </button>

              <button
                className="pomo-btn pomo-btn--ghost pomo-btn--icon"
                title="Próxima fase"
                onClick={goToNextPhase}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M5 4l8 6-8 6V4zM15 4v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Finish button */}
            <button
              className="pomo-btn pomo-btn--finish"
              onClick={handleFinish}
            >
              {completedPomodoros > 0 ? "✅ Terminar e guardar sessão" : "❌ Cancelar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
