import { useState, useEffect } from "react";
import { useAuthContext } from "../../context/AuthContext";
import {
  fetchSuggestions, generateSuggestions, markSuggestionRead,
} from "../../services/AiApi";
import type { Suggestion } from "../../services/AiApi";
import "./SuggestionsPanel.css";

const TIPO_ICONS: Record<string, string> = {
  spaced_repetition: "🔁",
  desequilibrio:     "⚖️",
  exame_proximo:     "📅",
  pomodoro:          "🍅",
};

const TIPO_LABELS: Record<string, string> = {
  spaced_repetition: "Revisão espaçada",
  desequilibrio:     "Desequilíbrio",
  exame_proximo:     "Exame próximo",
  pomodoro:          "Técnica Pomodoro",
};

interface Props {
  onNavigateToAi: () => void;
}

export default function SuggestionsPanel({ onNavigateToAi }: Props) {
  const { user } = useAuthContext();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading]         = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [dismissed, setDismissed]     = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.token) return;
    setLoading(true);
    fetchSuggestions(user.token)
      .then(data => setSuggestions(data.filter(s => !s.lida)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.token]);

  const handleGenerate = async () => {
    if (!user?.token) return;
    setGenerating(true);
    try {
      const data = await generateSuggestions(user.token);
      setSuggestions(data.filter(s => !s.lida));
    } catch {
      /* silencioso */
    } finally {
      setGenerating(false);
    }
  };

  const handleDismiss = async (id: string) => {
    if (!user?.token) return;
    setDismissed(prev => new Set([...prev, id]));
    try { await markSuggestionRead(user.token, id); } catch { /* silencioso */ }
  };

  const visible = suggestions.filter(s => !dismissed.has(s.id));

  if (loading) return null;

  return (
    <div className="sugg-panel">
      <div className="sugg-panel__header">
        <div className="sugg-panel__title">
          <span className="sugg-panel__icon">✦</span>
          Sugestões da IA
          {visible.length > 0 && (
            <span className="sugg-panel__badge">{visible.length}</span>
          )}
        </div>
        <button
          className={`sugg-panel__generate ${generating ? "sugg-panel__generate--loading" : ""}`}
          onClick={handleGenerate}
          disabled={generating}
          title="Gerar novas sugestões com base nos teus dados"
        >
          {generating ? (
            <span className="sugg-spinner" />
          ) : (
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v2M7 11v2M1 7h2M11 7h2M3.2 3.2l1.4 1.4M9.4 9.4l1.4 1.4M3.2 10.8l1.4-1.4M9.4 4.6l1.4-1.4"
                stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          )}
          {generating ? "A analisar…" : "Atualizar"}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="sugg-empty">
          <p>Sem sugestões de momento.</p>
          <p>Clica em "Atualizar" para a IA analisar os teus dados.</p>
        </div>
      ) : (
        <div className="sugg-list">
          {visible.map(s => (
            <div key={s.id} className={`sugg-item sugg-item--${s.tipo}`}>
              <div className="sugg-item__left">
                <span className="sugg-item__emoji">{TIPO_ICONS[s.tipo] ?? "💡"}</span>
                <div className="sugg-item__body">
                  <span className="sugg-item__tipo">{TIPO_LABELS[s.tipo] ?? s.tipo}</span>
                  <p className="sugg-item__msg">{s.mensagem}</p>
                </div>
              </div>
              <div className="sugg-item__actions">
                {s.tipo === "exame_proximo" || s.tipo === "desequilibrio" ? (
                  <button className="sugg-cta" onClick={onNavigateToAi}>
                    Perguntar à IA →
                  </button>
                ) : null}
                <button
                  className="sugg-dismiss"
                  onClick={() => handleDismiss(s.id)}
                  title="Dispensar sugestão"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
