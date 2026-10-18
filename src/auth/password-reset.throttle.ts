import { ExecutionContext } from '@nestjs/common';
import { minutes, ThrottlerModuleOptions } from '@nestjs/throttler';

/** Janela e limites de `POST /auth/forgot-password`. */
export const FORGOT_PASSWORD_WINDOW_MINUTES = 15;
export const FORGOT_PASSWORD_LIMIT_PER_IP = 10;
export const FORGOT_PASSWORD_LIMIT_PER_EMAIL = 3;

export const FORGOT_PASSWORD_THROTTLED_MESSAGE =
  'Muitas solicitações de redefinição de senha. Aguarde alguns minutos e tente novamente.';

/** E-mail do corpo, normalizado como no DTO (o guard roda antes do ValidationPipe). */
const emailOf = (req: { body?: { email?: unknown } }): string | undefined => {
  const email = req.body?.email;
  return typeof email === 'string' && email.trim() !== ''
    ? email.trim().toLowerCase()
    : undefined;
};

/**
 * Dois limites independentes, aplicados pelo `ThrottlerGuard` só na rota de pedido:
 * - por IP: `req.ip`, que já é o IP real do cliente atrás do proxy (TRUST_PROXY);
 * - por e-mail: impede inundar a caixa de entrada de uma pessoa a partir de vários IPs.
 * Os contadores ficam em memória (uma instância da API).
 */
export const FORGOT_PASSWORD_THROTTLE: ThrottlerModuleOptions = {
  errorMessage: FORGOT_PASSWORD_THROTTLED_MESSAGE,
  throttlers: [
    {
      name: 'forgot-password-ip',
      ttl: minutes(FORGOT_PASSWORD_WINDOW_MINUTES),
      limit: FORGOT_PASSWORD_LIMIT_PER_IP,
    },
    {
      name: 'forgot-password-email',
      ttl: minutes(FORGOT_PASSWORD_WINDOW_MINUTES),
      limit: FORGOT_PASSWORD_LIMIT_PER_EMAIL,
      getTracker: (req) => emailOf(req) ?? '',
      skipIf: (context: ExecutionContext) =>
        !emailOf(context.switchToHttp().getRequest()),
    },
  ],
};
