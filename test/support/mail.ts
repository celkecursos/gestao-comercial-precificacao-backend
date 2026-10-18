import { MailMessage, MailService } from '../../src/mail/mail.service';

/**
 * `MailService` dos testes: guarda os e-mails em vez de enviá-los.
 * Uso: `createTestApp((b) => b.overrideProvider(MailService).useValue(mail))`.
 */
export class MailCatcher extends MailService {
  readonly messages: MailMessage[] = [];
  private waiters: Array<() => void> = [];

  send(message: MailMessage): Promise<void> {
    this.messages.push(message);
    const waiters = this.waiters;
    this.waiters = [];
    waiters.forEach((wake) => wake());
    return Promise.resolve();
  }

  to(email: string): MailMessage[] {
    return this.messages.filter((message) => message.to === email);
  }

  /** Espera até `count` e-mails para `email` (o envio da API roda em segundo plano). */
  async waitFor(
    email: string,
    count = 1,
    timeoutMs = 5000,
  ): Promise<MailMessage> {
    const deadline = Date.now() + timeoutMs;
    while (this.to(email).length < count) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new Error(
          `Nenhum e-mail nº ${count} para ${email} em ${timeoutMs} ms.`,
        );
      }
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, remaining);
        this.waiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
    return this.to(email)[count - 1];
  }
}

/** Token do link de redefinição contido no e-mail. */
export function resetTokenFrom(message: MailMessage): string {
  const link = /https?:\/\/\S+/.exec(message.text)?.[0];
  const token = link && new URL(link).searchParams.get('token');
  if (!token) throw new Error('O e-mail não tem o link com o token.');
  return token;
}
