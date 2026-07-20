import Button from "../Button/Button";
import "./Navbar.css";

export type NavPage = "home" | "subjects" | "sessions" | "exams" | "ai" | "plan";

interface NavbarProps {
  activePage: NavPage;
  onNavigate: (page: string) => void;
  userName?: string;
  onLogout: () => void;
}

const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
    <path
      d="M7 3H3a1 1 0 00-1 1v10a1 1 0 001 1h4M12 13l4-4-4-4M16 9H7"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

const StudyFlowLogo = () => (
  <svg width="28" height="28" viewBox="0 0 52 52" fill="none">
    <circle cx="26" cy="26" r="25" stroke="url(#nav-lg)" strokeWidth="2" />
    <path
      d="M14 26 Q20 16 26 26 Q32 36 38 26"
      stroke="url(#nav-lg2)" strokeWidth="2.5" strokeLinecap="round" fill="none"
    />
    <circle cx="26" cy="26" r="3" fill="url(#nav-lg)" />
    <defs>
      <linearGradient id="nav-lg" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
      </linearGradient>
      <linearGradient id="nav-lg2" x1="14" y1="26" x2="38" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
      </linearGradient>
    </defs>
  </svg>
);

const NAV_LINKS: { key: NavPage; label: string }[] = [
  { key: "home",     label: "Início" },
  { key: "subjects", label: "Disciplinas" },
  { key: "sessions", label: "Sessões" },
  { key: "exams",    label: "Exames" },
  { key: "plan",     label: "Plano" },
  { key: "ai",       label: "IA ✦" },
];

export default function Navbar({ activePage, onNavigate, userName, onLogout }: NavbarProps) {
  const initials = userName
    ? userName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <header className="sf-nav">
      <div className="sf-nav__brand" onClick={() => onNavigate("home")} role="button" tabIndex={0}>
        <StudyFlowLogo />
        <span className="sf-nav__name">Study<span>Flow</span></span>
      </div>

      <nav className="sf-nav__links">
        {NAV_LINKS.map(({ key, label }) => (
          <button
            key={key}
            className={`sf-nav__link${activePage === key ? " sf-nav__link--active" : ""}`}
            onClick={() => onNavigate(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="sf-nav__right">
        <div className="sf-nav__avatar" title={userName}>
          {initials}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          iconLeft={<LogoutIcon />}
        >
          Sair
        </Button>
      </div>
    </header>
  );
}
