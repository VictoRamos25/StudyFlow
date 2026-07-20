export interface AuthUser {
  uid: string;
  email: string;
  nome: string;
  username: string;
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  nome: string;
  username: string;
  curso?: string;
}
