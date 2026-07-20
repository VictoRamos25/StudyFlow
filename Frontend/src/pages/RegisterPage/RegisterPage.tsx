import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { passwordStrength } from "../../utils/validator";
import "../LoginPage/auth.css";

interface Props {
  onNavigateToLogin: () => void;
}

type Step = 1 | 2;

export default function RegisterPage({ onNavigateToLogin }: Props) {
  const { handleRegister, loading, error, clearError, checkUsername } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [mounted, setMounted] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [curso, setCurso] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [strength, setStrength] = useState({ score: 0, label: "", className: "" });

  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  useEffect(() => {
    setStrength(passwordStrength(password));
  }, [password]);

  useEffect(() => {
    if (!username || username.length < 3) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    usernameTimer.current = setTimeout(async () => {
      const available = await checkUsername(username);
      setUsernameStatus(available ? "available" : "taken");
    }, 600);
    return () => { if (usernameTimer.current) clearTimeout(usernameTimer.current); };
  }, [username, checkUsername]);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) return;
    clearError();
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword || usernameStatus === "taken" || strength.score < 2) return;
    try {
      await handleRegister({ email, password, nome, username, curso });
    } catch {
      // erro já está no hook
    }
  };

  return (
    <div className="auth-root">
      <div className="particles">
        {[...Array(18)].map((_, i) => (
          <span key={i} className="particle" style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>

      <div className={`auth-split reversed ${mounted ? "visible" : ""}`}>
        {/* Brand panel */}
        <div className="auth-brand register-brand">
          <div className="brand-inner">
            <div className="brand-logo">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="26" r="25" stroke="url(#lg-r)" strokeWidth="2" />
                <path d="M14 26 Q20 16 26 26 Q32 36 38 26" stroke="url(#lg2-r)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <circle cx="26" cy="26" r="3" fill="url(#lg-r)" />
                <defs>
                  <linearGradient id="lg-r" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
                  </linearGradient>
                  <linearGradient id="lg2-r" x1="14" y1="26" x2="38" y2="26" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="brand-name">Study<span>Flow</span></h1>
            <p className="brand-tagline">Começa a tua jornada<br />de aprendizagem hoje.</p>
            <div className="register-steps-visual">
              <div className={`rstep ${step >= 1 ? "done" : ""}`}>
                <div className="rstep-num">1</div>
                <div><strong>O teu perfil</strong><span>Nome e email</span></div>
              </div>
              <div className="rstep-line" />
              <div className={`rstep ${step >= 2 ? "done" : ""}`}>
                <div className="rstep-num">2</div>
                <div><strong>A tua identidade</strong><span>Username e segurança</span></div>
              </div>
            </div>
            <div className="brand-quote">
              <span>"</span>Cada grande especialista<br />foi um dia iniciante.<span>"</span>
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="auth-form-panel">
          <div className="auth-card">
            <div className="card-header">
              <div className="step-indicator">
                <div className={`step-dot ${step === 1 ? "active" : "past"}`} />
                <div className={`step-line ${step === 2 ? "filled" : ""}`} />
                <div className={`step-dot ${step === 2 ? "active" : ""}`} />
              </div>
              <h2>{step === 1 ? "Criar conta" : "Quase lá!"}</h2>
              <p>{step === 1 ? "Vamos começar com o básico" : "Define o teu username e segurança"}</p>
            </div>

            {error && (
              <div className="auth-error" onClick={clearError}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#F87171" strokeWidth="1.5" />
                  <path d="M8 4.5V8.5M8 11H8.01" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleStep1} className="auth-form" noValidate>
                <div className="field-group">
                  <label htmlFor="reg-nome">Nome completo</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M2 16c0-3.31 3.13-6 7-6s7 2.69 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <input id="reg-nome" type="text" placeholder="O teu nome"
                      value={nome} onChange={e => setNome(e.target.value)} required autoFocus />
                  </div>
                </div>
                <div className="field-group">
                  <label htmlFor="reg-email">Email</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M2 4h14a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M1 5l8 5.5L17 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <input id="reg-email" type="email" placeholder="o.teu@email.com"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="field-group">
                  <label htmlFor="reg-curso">
                    Curso <span className="optional">(opcional)</span>
                  </label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 2L1 7l8 4 8-4-8-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M1 7v6M9 11l6-3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <input id="reg-curso" type="text" placeholder="Ex: Engenharia Informática"
                      value={curso} onChange={e => setCurso(e.target.value)} />
                  </div>
                </div>
                <button type="submit" className="auth-btn">
                  Continuar
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 9h12M10 5l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <div className="field-group">
                  <label htmlFor="reg-username">
                    Username
                    {usernameStatus === "available" && <span className="username-ok">✓ Disponível</span>}
                    {usernameStatus === "taken" && <span className="username-err">✗ Indisponível</span>}
                  </label>
                  <div className="input-wrapper">
                    <span className="at-prefix">@</span>
                    <input
                      id="reg-username"
                      type="text"
                      placeholder="o_teu_username"
                      value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      required
                      autoFocus
                      className={`has-prefix ${usernameStatus === "taken" ? "input-error" : usernameStatus === "available" ? "input-success" : ""}`}
                    />
                    {usernameStatus === "checking" && <span className="checking-spin" />}
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="reg-password">Palavra-passe</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <rect x="3" y="8" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M6 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="9" cy="12" r="1" fill="currentColor" />
                    </svg>
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="toggle-pw" onClick={() => setShowPassword(v => !v)}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M2 9s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </button>
                  </div>
                  {password && (
                    <div className="strength-bar">
                      <div className={`strength-fill ${strength.className}`} style={{ width: `${(strength.score / 4) * 100}%` }} />
                      <span className={`strength-label ${strength.className}`}>{strength.label}</span>
                    </div>
                  )}
                </div>

                <div className="field-group">
                  <label htmlFor="reg-confirm">Confirmar palavra-passe</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M3 9l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <input
                      id="reg-confirm"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      className={
                        confirmPassword && confirmPassword !== password ? "input-error" :
                        confirmPassword && confirmPassword === password ? "input-success" : ""
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <button type="button" className="back-btn" onClick={() => setStep(1)}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M15 9H3M8 5L3 9l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className={`auth-btn flex-1 ${loading ? "loading" : ""}`}
                    disabled={loading}
                  >
                    {loading ? <span className="btn-spinner" /> : "Criar conta"}
                  </button>
                </div>
              </form>
            )}

            {step === 1 && (
              <>
                <div className="auth-divider"><span>ou</span></div>
                <button type="button" className="google-btn">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.38a4.6 4.6 0 01-2 3.02v2.5h3.22c1.88-1.73 2.97-4.28 2.97-7.31z" fill="#4285F4" />
                    <path d="M10 20c2.7 0 4.96-.9 6.61-2.43l-3.22-2.5c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.75-5.59-4.1H1.1v2.58A9.99 9.99 0 0010 20z" fill="#34A853" />
                    <path d="M4.41 11.93A6 6 0 014.1 10c0-.67.11-1.32.31-1.93V5.49H1.1a10 10 0 000 9.02l3.31-2.58z" fill="#FBBC05" />
                    <path d="M10 3.96c1.47 0 2.79.5 3.83 1.5l2.86-2.86A9.96 9.96 0 0010 0 9.99 9.99 0 001.1 5.5l3.31 2.57C5.2 5.71 7.4 3.96 10 3.96z" fill="#EA4335" />
                  </svg>
                  Registar com Google
                </button>
              </>
            )}

            <p className="auth-switch">
              Já tens conta?{" "}
              <button type="button" onClick={onNavigateToLogin}>Entrar</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
