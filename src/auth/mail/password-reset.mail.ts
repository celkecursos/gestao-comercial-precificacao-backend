import { MailMessage } from '../../mail/mail.service';

interface PasswordResetMailData {
  to: string;
  name: string;
  link: string;
  expiresInMinutes: number;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** E-mail de redefinição de senha, em HTML simples e em texto. */
export function buildPasswordResetMail({
  to,
  name,
  link,
  expiresInMinutes,
}: PasswordResetMailData): MailMessage {
  const subject = 'Redefinição de senha';
  const validity = `${expiresInMinutes} minutos`;

  const text = [
    `Olá, ${name}!`,
    '',
    'Recebemos um pedido para redefinir a senha da sua conta.',
    'Para criar uma nova senha, acesse o link abaixo:',
    '',
    link,
    '',
    `O link vale por ${validity} e pode ser usado uma única vez.`,
    'Se você não pediu a redefinição, ignore este e-mail: a sua senha continua a mesma.',
  ].join('\n');

  const safeLink = escapeHtml(link);
  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2933;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:20px;">Redefinição de senha</h1>
      <p style="margin:0 0 12px;">Olá, ${escapeHtml(name)}!</p>
      <p style="margin:0 0 24px;">Recebemos um pedido para redefinir a senha da sua conta. Para criar uma nova senha, clique no botão abaixo.</p>
      <p style="margin:0 0 24px;">
        <a href="${safeLink}" style="display:inline-block;padding:12px 20px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Redefinir senha</a>
      </p>
      <p style="margin:0 0 12px;font-size:14px;">O link vale por ${validity} e pode ser usado uma única vez. Se o botão não funcionar, copie e cole este endereço no navegador:</p>
      <p style="margin:0 0 24px;font-size:14px;word-break:break-all;"><a href="${safeLink}" style="color:#1d4ed8;">${safeLink}</a></p>
      <p style="margin:0;font-size:13px;color:#52606d;">Se você não pediu a redefinição, ignore este e-mail: a sua senha continua a mesma.</p>
    </div>
  </body>
</html>`;

  return { to, subject, html, text };
}
