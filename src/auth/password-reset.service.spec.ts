import { BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import {
  createRepositoryMock,
  RepositoryMock,
} from '../../test/utils/repository.mock';
import { Role } from '../common/enums/role.enum';
import { DEFAULT_PASSWORD_RESET_URL } from '../config/env.validation';
import { MailMessage, MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import {
  hashResetToken,
  INVALID_RESET_TOKEN_MESSAGE,
  PasswordResetService,
} from './password-reset.service';

const NOW = new Date('2026-10-18T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let repository: RepositoryMock<PasswordResetToken>;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findByEmail' | 'findOne' | 'updatePassword'>
  >;
  let mailService: { send: jest.Mock };
  let env: Record<string, unknown>;

  const buildUser = (overrides: Partial<User> = {}): User =>
    Object.assign(new User(), {
      id: 7,
      name: 'Kelly',
      email: 'kelly@celke.com.br',
      role: Role.User,
      active: true,
      ...overrides,
    });

  const buildToken = (
    overrides: Partial<PasswordResetToken> = {},
  ): PasswordResetToken =>
    Object.assign(new PasswordResetToken(), {
      id: 3,
      userId: 7,
      tokenHash: hashResetToken('token-valido'),
      expiresAt: new Date(NOW.getTime() + HOUR),
      usedAt: null,
      ...overrides,
    });

  /** O e-mail enviado e o token que está no link dele. */
  const sentMail = () => {
    const message = mailService.send.mock.calls[0][0] as MailMessage;
    const link = new URL(/https?:\/\/\S+/.exec(message.text)![0]);
    return { message, link, token: link.searchParams.get('token')! };
  };

  beforeEach(async () => {
    repository = createRepositoryMock<PasswordResetToken>();
    usersService = {
      findByEmail: jest.fn(),
      findOne: jest.fn(),
      updatePassword: jest.fn(),
    };
    mailService = { send: jest.fn().mockResolvedValue(undefined) };
    env = { PASSWORD_RESET_URL: 'https://app.celke.uno/redefinir-senha' };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: repository,
        },
        { provide: UsersService, useValue: usersService },
        { provide: MailService, useValue: mailService },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => env[key] },
        },
      ],
    }).compile();

    service = moduleRef.get(PasswordResetService);
  });

  describe('sendResetLink', () => {
    afterEach(() => jest.useRealTimers());

    it.each([
      ['e-mail não cadastrado', null],
      ['usuário inativo', buildUser({ active: false })],
    ])('não gera token nem envia e-mail (%s)', async (_case, user) => {
      usersService.findByEmail.mockResolvedValue(user);

      await service.sendResetLink('kelly@celke.com.br');

      expect(repository.delete).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
      expect(mailService.send).not.toHaveBeenCalled();
    });

    it('invalida os pedidos anteriores e grava só o hash do token, válido por 1 hora', async () => {
      jest.useFakeTimers({ now: NOW });
      usersService.findByEmail.mockResolvedValue(buildUser());

      await service.sendResetLink('kelly@celke.com.br');

      const { token } = sentMail();
      expect(repository.delete).toHaveBeenCalledWith({ userId: 7 });
      expect(repository.save).toHaveBeenCalledWith({
        userId: 7,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(NOW.getTime() + HOUR),
        usedAt: null,
      });
      expect(hashResetToken(token)).not.toBe(token);
      expect(repository.delete.mock.invocationCallOrder[0]).toBeLessThan(
        repository.save.mock.invocationCallOrder[0],
      );
    });

    it('envia ao usuário o link com o token, em HTML e em texto', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());

      await service.sendResetLink('kelly@celke.com.br');

      const { message, link, token } = sentMail();
      expect(message.to).toBe('kelly@celke.com.br');
      expect(`${link.origin}${link.pathname}`).toBe(
        'https://app.celke.uno/redefinir-senha',
      );
      expect(token).toMatch(/^[\w-]{43}$/);
      expect(message.html).toContain(link.toString());
    });

    it.each([
      [
        'mantém a query existente',
        'https://app.celke.uno/conta?aba=senha',
        'https://app.celke.uno/conta?aba=senha&token=',
      ],
      [
        'usa o padrão de desenvolvimento quando não configurada',
        undefined,
        `${DEFAULT_PASSWORD_RESET_URL}?token=`,
      ],
    ])(
      'monta o link a partir de PASSWORD_RESET_URL (%s)',
      async (_case, url, prefix) => {
        env.PASSWORD_RESET_URL = url;
        usersService.findByEmail.mockResolvedValue(buildUser());

        await service.sendResetLink('kelly@celke.com.br');

        expect(sentMail().link.toString().startsWith(prefix)).toBe(true);
      },
    );
  });

  describe('requestReset', () => {
    it('não propaga a falha do envio: registra no log', async () => {
      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      usersService.findByEmail.mockResolvedValue(buildUser());
      mailService.send.mockRejectedValue(new Error('SMTP fora do ar'));

      expect(() => service.requestReset('kelly@celke.com.br')).not.toThrow();
      await new Promise((resolve) => setImmediate(resolve));

      expect(logError).toHaveBeenCalledWith(
        'Falha ao processar um pedido de redefinição de senha.',
        expect.stringContaining('SMTP fora do ar'),
      );
      logError.mockRestore();
    });
  });

  describe('resetPassword', () => {
    const dto = { token: 'token-valido', newPassword: 'NovaSenha@2026' };

    beforeEach(() => {
      jest.useFakeTimers({ now: NOW });
      usersService.findOne.mockResolvedValue(buildUser());
      repository.update!.mockResolvedValue({ affected: 1 });
    });

    afterEach(() => jest.useRealTimers());

    const expectRejectedWithoutChanges = async () => {
      await expect(service.resetPassword(dto)).rejects.toThrow(
        new BadRequestException(INVALID_RESET_TOKEN_MESSAGE),
      );
      expect(usersService.updatePassword).not.toHaveBeenCalled();
    };

    it('procura o token pelo hash', async () => {
      repository.findOneBy!.mockResolvedValue(buildToken());

      await service.resetPassword(dto);

      expect(repository.findOneBy).toHaveBeenCalledWith({
        tokenHash: hashResetToken('token-valido'),
      });
    });

    it('rejeita token inexistente', async () => {
      repository.findOneBy!.mockResolvedValue(null);
      await expectRejectedWithoutChanges();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejeita token já usado', async () => {
      repository.findOneBy!.mockResolvedValue(
        buildToken({ usedAt: new Date(NOW.getTime() - 1000) }),
      );
      await expectRejectedWithoutChanges();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it.each([
      ['expirou há 1 ms', -1, false],
      ['expira exatamente agora', 0, false],
      ['expira em 1 ms', 1, true],
      ['recém-emitido (1 hora)', HOUR, true],
    ])('validade: token que %s', async (_case, offset, accepted) => {
      repository.findOneBy!.mockResolvedValue(
        buildToken({ expiresAt: new Date(NOW.getTime() + offset) }),
      );

      if (accepted) {
        await expect(service.resetPassword(dto)).resolves.toBeUndefined();
      } else {
        await expectRejectedWithoutChanges();
      }
    });

    it('rejeita quando o usuário foi desativado depois do pedido, sem consumir o token', async () => {
      repository.findOneBy!.mockResolvedValue(buildToken());
      usersService.findOne.mockResolvedValue(buildUser({ active: false }));

      await expectRejectedWithoutChanges();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejeita quando outro pedido consumiu o token ao mesmo tempo', async () => {
      repository.findOneBy!.mockResolvedValue(buildToken());
      repository.update!.mockResolvedValue({ affected: 0 });

      await expectRejectedWithoutChanges();
    });

    it('consome o token e grava a senha por UsersService.updatePassword()', async () => {
      repository.findOneBy!.mockResolvedValue(buildToken());

      await service.resetPassword(dto);

      expect(repository.update).toHaveBeenCalledWith(
        { id: 3, usedAt: IsNull() },
        { usedAt: NOW },
      );
      expect(usersService.updatePassword).toHaveBeenCalledWith(
        7,
        'NovaSenha@2026',
      );
    });
  });
});
