/** Um e-mail a enviar: sempre com a versão HTML e a versão em texto. */
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Contrato de envio de e-mail. Os módulos dependem só desta classe (token de injeção);
 * a implementação é escolhida por MAIL_DRIVER em `MailModule`.
 */
export abstract class MailService {
  abstract send(message: MailMessage): Promise<void>;
}
