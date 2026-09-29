export type UserRole = 'ADMIN' | 'AGENT' | 'EXTENSION';

export interface AuthUser {
  id: string;
  email?: string;
  name: string;
  role: UserRole;
}

export interface JwtTokenPayload {
  sub: string;
  role: UserRole;
  email?: string;
  iat?: number;
  exp?: number;
}
