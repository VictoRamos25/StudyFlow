export const validators = {
  email: (value: string): string => {
    if (!value.trim()) return "O email é obrigatório";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Email inválido";
    return "";
  },

  password: (value: string): string => {
    if (!value) return "A palavra-passe é obrigatória";
    if (value.length < 8) return "Mínimo 8 caracteres";
    return "";
  },

  nome: (value: string): string => {
    if (!value.trim()) return "O nome é obrigatório";
    if (value.trim().length < 2) return "Nome demasiado curto";
    return "";
  },

  username: (value: string): string => {
    if (!value) return "O username é obrigatório";
    if (value.length < 3) return "Mínimo 3 caracteres";
    if (value.length > 30) return "Máximo 30 caracteres";
    if (!/^[a-z0-9_]+$/.test(value))
      return "Só letras minúsculas, números e _";
    return "";
  },

  confirmPassword: (password: string, confirm: string): string => {
    if (!confirm) return "Confirma a palavra-passe";
    if (password !== confirm) return "As palavras-passe não coincidem";
    return "";
  },
};

export function passwordStrength(password: string): {
  score: number;
  label: string;
  className: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ["", "Fraca", "Razoável", "Boa", "Forte"];
  const classes = ["", "weak", "fair", "good", "strong"];
  return { score, label: labels[score], className: classes[score] };
}
