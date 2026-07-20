import { AuthProvider, useAuthContext } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage/LoginPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import HomePage from "./pages/HomePage/HomePage";
import SubjectsPage from "./pages/SubjectsPage/SubjectsPage";
import SessionsPage from "./pages/SessionsPage/SessionsPage";
import ExamsPage from "./pages/ExamsPage/ExamesPage";
import AiPage from "./pages/IAPage/AiPage";
import PlanPage from "./pages/PlanPage/PlanPage";
import { useState } from "react";

type AuthPage = "login" | "register";
export type AppPage = "home" | "subjects" | "sessions" | "exams" | "ai" | "plan";

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuthContext();
  const [authPage, setAuthPage] = useState<AuthPage>("login");
  const [appPage, setAppPage] = useState<AppPage>("home");

  const navigate = (page: string) => setAppPage(page as AppPage);

  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#080c14",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="40" height="40" viewBox="0 0 52 52" fill="none" style={{ animation: "spin 1.2s linear infinite" }}>
          <circle cx="26" cy="26" r="25" stroke="url(#sp-lg)" strokeWidth="2" strokeDasharray="100 58" />
          <defs>
            <linearGradient id="sp-lg" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7EB8F7" /><stop offset="1" stopColor="#A78BFA" />
            </linearGradient>
          </defs>
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isAuthenticated) {
    switch (appPage) {
      case "ai":      return <AiPage      onNavigate={navigate} />;
      case "plan":    return <PlanPage    onNavigate={navigate} />;
      case "subjects": return <SubjectsPage onNavigate={navigate} />;
      case "sessions": return <SessionsPage onNavigate={navigate} />;
      case "exams":    return <ExamsPage    onNavigate={navigate} />;
      case "home":
      default:         return <HomePage     onNavigate={navigate} />;
    }
  }

  if (authPage === "login") {
    return <LoginPage onNavigateToRegister={() => setAuthPage("register")} />;
  }

  return <RegisterPage onNavigateToLogin={() => setAuthPage("login")} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}