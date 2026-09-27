import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '../common/enums/role.enum';
import { PasswordService } from '../common/security/password.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<
    Pick<
      UsersService,
      | 'findByEmailWithPassword'
      | 'findOne'
      | 'findOneWithPassword'
      | 'updatePassword'
      | 'incrementTokenVersion'
      | 'update'
    >
  >;
  let passwordService: jest.Mocked<Pick<PasswordService, 'compare'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;

  const buildUser = (overrides: Partial<User> = {}): User =>
    Object.assign(new User(), {
      id: 1,
      name: 'Cesar',
      email: 'cesar@celke.com.br',
      password: 'hash',
      role: Role.Admin,
      active: true,
      tokenVersion: 3,
      ...overrides,
    });

  beforeEach(async () => {
    usersService = {
      findByEmailWithPassword: jest.fn(),
      findOne: jest.fn(),
      findOneWithPassword: jest.fn(),
      updatePassword: jest.fn(),
      incrementTokenVersion: jest.fn(),
      update: jest.fn(),
    };
    passwordService = { compare: jest.fn() };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed-token') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: PasswordService, useValue: passwordService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn(() => '1d') } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('login', () => {
    it('retorna o token quando as credenciais são válidas', async () => {
      const user = buildUser();
      usersService.findByEmailWithPassword.mockResolvedValue(user);
      usersService.findOne.mockResolvedValue(user);
      passwordService.compare.mockResolvedValue(true);

      const result = await service.login({
        email: user.email,
        password: '123456A#b',
      });

      expect(result).toEqual({
        accessToken: 'signed-token',
        tokenType: 'Bearer',
        expiresIn: '1d',
        user,
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 1,
        email: user.email,
        role: Role.Admin,
        tv: 3,
      });
    });

    it('rejeita e-mail inexistente', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@x.com', password: 'qualquer' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejeita senha incorreta', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(buildUser());
      passwordService.compare.mockResolvedValue(false);

      await expect(
        service.login({ email: 'cesar@celke.com.br', password: 'errada' }),
      ).rejects.toThrow('E-mail ou senha inválidos.');
    });

    it('rejeita usuário inativo', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(
        buildUser({ active: false }),
      );
      passwordService.compare.mockResolvedValue(true);

      await expect(
        service.login({ email: 'cesar@celke.com.br', password: '123456A#b' }),
      ).rejects.toThrow('Usuário inativo.');
    });
  });

  it('logout invalida os tokens do usuário', async () => {
    await service.logout(7);
    expect(usersService.incrementTokenVersion).toHaveBeenCalledWith(7);
  });

  it('updateProfile impede alteração do próprio papel/status ao repassar o id do usuário', async () => {
    await service.updateProfile(5, { name: 'Novo Nome' });
    expect(usersService.update).toHaveBeenCalledWith(
      5,
      { name: 'Novo Nome' },
      5,
    );
  });

  describe('changePassword', () => {
    it('rejeita senha atual incorreta', async () => {
      usersService.findOneWithPassword.mockResolvedValue(buildUser());
      passwordService.compare.mockResolvedValue(false);

      await expect(
        service.changePassword(1, {
          currentPassword: 'errada',
          newPassword: 'NovaSenha@2026',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.updatePassword).not.toHaveBeenCalled();
    });

    it('rejeita nova senha igual à atual', async () => {
      usersService.findOneWithPassword.mockResolvedValue(buildUser());
      passwordService.compare.mockResolvedValue(true);

      await expect(
        service.changePassword(1, {
          currentPassword: '123456A#b',
          newPassword: '123456A#b',
        }),
      ).rejects.toThrow('A nova senha deve ser diferente da senha atual.');
    });

    it('altera a senha e emite um novo token', async () => {
      const user = buildUser();
      usersService.findOneWithPassword.mockResolvedValue(user);
      usersService.findOne.mockResolvedValue(buildUser({ tokenVersion: 4 }));
      passwordService.compare.mockResolvedValue(true);

      const result = await service.changePassword(1, {
        currentPassword: '123456A#b',
        newPassword: 'NovaSenha@2026',
      });

      expect(usersService.updatePassword).toHaveBeenCalledWith(
        1,
        'NovaSenha@2026',
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ tv: 4 }),
      );
      expect(result.accessToken).toBe('signed-token');
    });
  });
});
