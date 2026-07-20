import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import "./auth.css";

interface Props {
  onNavigateToRegister: () => void;
}

export default function LoginPage({ onNavigateToRegister }: Props) {
  const { handleLogin, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await handleLogin({ email, password });
      // AuthContext atualiza isAuthenticated → App.tsx redireciona para HomePage
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

      <div className={`auth-split ${mounted ? "visible" : ""}`}>
        {/* Brand panel */}
        <div className="auth-brand">
          <div className="brand-inner">
            <div className="brand-logo">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="26" r="25" stroke="url(#lg)" strokeWidth="2" />
                <path d="M14 26 Q20 16 26 26 Q32 36 38 26" stroke="url(#lg2)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <circle cx="26" cy="26" r="3" fill="url(#lg)" />
                <defs>
                  <linearGradient id="lg" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
                  </linearGradient>
                  <linearGradient id="lg2" x1="14" y1="26" x2="38" y2="26" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="brand-name">Study<span>Flow</span></h1>
            <p className="brand-tagline">O teu espaço de aprendizagem,<br />reimaginado.</p>
            <div className="brand-features">
              {["Sessões de estudo inteligentes","Organiza disciplinas e exames","Acompanha o teu progresso","IA como co-piloto de estudo"].map(f => (
                <div key={f} className="feature-item">
                  <span className="feature-dot" /><span>{f}</span>
                </div>
              ))}
            </div>
            <div className="brand-quote">
              <span>"</span>O fluxo é o estado em que o<br />aprendizado acontece.<span>"</span>
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="auth-form-panel">
          <div className="auth-card">
            <div className="card-header">
              <h2>Entrar</h2>
              <p>Bem-vindo de volta ao teu fluxo</p>
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

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className="field-group">
                <label htmlFor="login-email">Email</label>
                <div className="input-wrapper">
                  <svg className="input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M2 4h14a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M1 5l8 5.5L17 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <input id="login-email" type="email" placeholder="o.teu@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="login-password">
                  Palavra-passe
                  <a href="#" className="forgot-link">Esqueceste-te?</a>
                </label>
                <div className="input-wrapper">
                  <svg className="input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="3" y="8" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="9" cy="12" r="1" fill="currentColor" />
                  </svg>
                  <input id="login-password" type={showPassword ? "text" : "password"}
                    placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                  <button type="button" className="toggle-pw" onClick={() => setShowPassword(v => !v)}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M2 9s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
                      {showPassword && <path d="M3 3l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
                    </svg>
                  </button>
                </div>
              </div>

              <button type="submit" className={`auth-btn ${loading ? "loading" : ""}`} disabled={loading}>
                {loading ? <span className="btn-spinner" /> : <>Entrar <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9h12M10 5l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></>}
              </button>
            </form>

            <div className="auth-divider"><span>ou</span></div>

            <button type="button" className="google-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.38a4.6 4.6 0 01-2 3.02v2.5h3.22c1.88-1.73 2.97-4.28 2.97-7.31z" fill="#4285F4"/>
                <path d="M10 20c2.7 0 4.96-.9 6.61-2.43l-3.22-2.5c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.75-5.59-4.1H1.1v2.58A9.99 9.99 0 0010 20z" fill="#34A853"/>
                <path d="M4.41 11.93A6 6 0 014.1 10c0-.67.11-1.32.31-1.93V5.49H1.1a10 10 0 000 9.02l3.31-2.58z" fill="#FBBC05"/>
                <path d="M10 3.96c1.47 0 2.79.5 3.83 1.5l2.86-2.86A9.96 9.96 0 0010 0 9.99 9.99 0 001.1 5.5l3.31 2.57C5.2 5.71 7.4 3.96 10 3.96z" fill="#EA4335"/>
              </svg>
              Continuar com Google
            </button>

            <p className="auth-switch">
              Ainda não tens conta?{" "}
              <button type="button" onClick={onNavigateToRegister}>Criar conta</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
