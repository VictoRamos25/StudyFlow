import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useAuthContext } from "../../context/AuthContext";
import Navbar from "../../components/ui/Navbar/Navbar";
import { sendChatMessage, fetchChatHistory } from "../../services/AiApi";
import type { ChatMessage } from "../../types/ai.types";
import "./AiPage.css";

interface Props { onNavigate: (page: string) => void; }

const SUGGESTIONS = [
  "Quantas horas estudei esta semana?",
  "Qual a disciplina que estou a negligenciar?",
  "Como devo distribuir o estudo para o próximo exame?",
  "Quando costumo ter mais foco ao longo do dia?",
  "Estou a evoluir nas minhas notas?",
  "Compara o meu desempenho este mês com o anterior.",
];

function TypingDots() {
  return (
    <div className="ai-typing">
      <span /><span /><span />
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`ai-bubble-row ai-bubble-row--${isUser ? "user" : "model"}`}>
      {!isUser && (
        <div className="ai-avatar">
          <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
            <path d="M11 2C6 2 2 5.6 2 10c0 2 .8 3.8 2 5.2V20l4-2.5c1 .3 2 .5 3 .5 5 0 9-3.6 9-8s-4-8-9-8z"
              stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      <div className={`ai-bubble ai-bubble--${isUser ? "user" : "model"}`}>
        {msg.content.split("\n").map((line, i, arr) => (
          <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
        ))}
      </div>
    </div>
  );
}

export default function AiPage({ onNavigate }: Props) {
  const { user, handleLogout } = useAuth();
  const { user: authUser } = useAuthContext();

  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError]             = useState("");
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  const firstName = user?.nome?.split(" ")[0] ?? "Estudante";

  // ── Carregar histórico persistido ao montar ────────────────────────────────
  useEffect(() => {
    if (!authUser?.token) { setHistoryLoading(false); return; }
    fetchChatHistory(authUser.token)
      .then(history => {
        if (history.length > 0) setMessages(history);
      })
      .catch(() => { /* falha silenciosa — começa com chat vazio */ })
      .finally(() => setHistoryLoading(false));
  }, [authUser?.token]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Enviar mensagem ────────────────────────────────────────────────────────
  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading || !authUser?.token) return;

    const userMsg: ChatMessage = { role: "user", content: msg };
    const history = [...messages, userMsg];

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const reply = await sendChatMessage(authUser.token, msg, history);
      setMessages(prev => [...prev, { role: "model", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao contactar o agente.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0 && !historyLoading;

  return (
    <div className="ai-root">
      <div className="ai-particles">
        {[...Array(12)].map((_, i) => (
          <span key={i} className="ai-particle" style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>

      <Navbar
        activePage="ai"
        onNavigate={onNavigate}
        userName={user?.nome}
        onLogout={handleLogout}
      />

      <main className="ai-main">
        <div className="ai-chat-wrap">

          {/* A carregar histórico */}
          {historyLoading && (
            <div className="ai-loading-history">
              <div className="ai-loading-spinner" />
              <span>A carregar histórico…</span>
            </div>
          )}

          {/* Welcome state */}
          {!historyLoading && isEmpty && (
            <div className="ai-welcome">
              <div className="ai-welcome__orb">
                <svg width="32" height="32" viewBox="0 0 22 22" fill="none">
                  <path d="M11 2C6 2 2 5.6 2 10c0 2 .8 3.8 2 5.2V20l4-2.5c1 .3 2 .5 3 .5 5 0 9-3.6 9-8s-4-8-9-8z"
                    stroke="url(#ai-orb-g)" strokeWidth="1.4" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="ai-orb-g" x1="2" y1="2" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#7EB8F7"/><stop offset="1" stopColor="#A78BFA"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2 className="ai-welcome__title">
                Olá, {firstName} <span>✦</span>
              </h2>
              <p className="ai-welcome__sub">
                Sou o teu copiloto de estudo pessoal.<br />
                Pergunta-me qualquer coisa sobre o teu progresso académico.
              </p>
              <div className="ai-suggestions">
                {SUGGESTIONS.map(s => (
                  <button key={s} className="ai-suggestion-chip" onClick={() => handleSend(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {!historyLoading && !isEmpty && (
            <div className="ai-messages">
              {messages.map((m, i) => (
                <MessageBubble key={i} msg={m} />
              ))}
              {loading && (
                <div className="ai-bubble-row ai-bubble-row--model">
                  <div className="ai-avatar">
                    <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                      <path d="M11 2C6 2 2 5.6 2 10c0 2 .8 3.8 2 5.2V20l4-2.5c1 .3 2 .5 3 .5 5 0 9-3.6 9-8s-4-8-9-8z"
                        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="ai-bubble ai-bubble--model">
                    <TypingDots />
                  </div>
                </div>
              )}
              {error && (
                <div className="ai-error-msg">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="ai-input-wrap">
          {!isEmpty && (
            <div className="ai-quick-row">
              {SUGGESTIONS.slice(0, 3).map(s => (
                <button
                  key={s}
                  className="ai-suggestion-chip ai-suggestion-chip--small"
                  onClick={() => handleSend(s)}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="ai-input-bar">
            <textarea
              ref={inputRef}
              className="ai-textarea"
              placeholder="Escreve a tua pergunta… (Enter para enviar)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || historyLoading}
              rows={1}
            />
            <button
              className={`ai-send-btn ${loading ? "ai-send-btn--loading" : ""}`}
              onClick={() => handleSend()}
              disabled={loading || !input.trim() || historyLoading}
              aria-label="Enviar mensagem"
            >
              {loading ? (
                <div className="ai-send-spinner" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M16 9H2M9 2l7 7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
