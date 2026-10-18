import { buildPasswordResetMail } from './password-reset.mail';

describe('buildPasswordResetMail', () => {
  const data = {
    to: 'kelly@celke.com.br',
    name: 'Kelly',
    link: 'https://app.celke.uno/redefinir-senha?token=abc&origem=email',
    expiresInMinutes: 60,
  };

  it('monta o e-mail em português, com o link nas duas versões', () => {
    const mail = buildPasswordResetMail(data);

    expect(mail).toMatchObject({
      to: 'kelly@celke.com.br',
      subject: 'Redefinição de senha',
    });
    expect(mail.text).toContain('Olá, Kelly!');
    expect(mail.text).toContain(data.link);
    expect(mail.text).toContain('60 minutos');
    expect(mail.html).toContain('lang="pt-BR"');
    expect(mail.html).toContain(
      'href="https://app.celke.uno/redefinir-senha?token=abc&amp;origem=email"',
    );
  });

  it('escapa o nome do usuário no HTML', () => {
    const mail = buildPasswordResetMail({
      ...data,
      name: '<script>alert(1)</script>',
    });

    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
