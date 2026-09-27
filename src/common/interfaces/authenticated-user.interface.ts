import { Role } from '../enums/role.enum';

/** Usuário anexado a `request.user` após a validação do JWT. */
export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

/** Conteúdo (payload) do token JWT emitido no login. */
export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
  /** Versão do token do usuário; tokens com versão antiga são rejeitados (logout, troca de senha). */
  tv: number;
}
