import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  createRepositoryMock,
  RepositoryMock,
} from '../../test/utils/repository.mock';
import { Role } from '../common/enums/role.enum';
import { PasswordService } from '../common/security/password.service';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: RepositoryMock<User>;
  let passwordService: { hash: jest.Mock };

  const existingUser = (overrides: Partial<User> = {}) =>
    Object.assign(new User(), {
      id: 1,
      name: 'Cesar',
      email: 'cesar@celke.com.br',
      role: Role.Admin,
      active: true,
      ...overrides,
    });

  beforeEach(async () => {
    repository = createRepositoryMock<User>();
    passwordService = { hash: jest.fn().mockResolvedValue('hashed-password') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
        { provide: PasswordService, useValue: passwordService },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe('create', () => {
    it('grava a senha com hash e usa USER como papel padrão', async () => {
      repository
        .findOneBy!.mockResolvedValueOnce(null) // verificação de e-mail
        .mockResolvedValueOnce(existingUser({ id: 10, role: Role.User }));

      await service.create({
        name: 'Maria',
        email: 'maria@empresa.com.br',
        password: 'Senha@123',
      });

      expect(passwordService.hash).toHaveBeenCalledWith('Senha@123');
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'maria@empresa.com.br',
          password: 'hashed-password',
          role: Role.User,
        }),
      );
    });

    it('rejeita e-mail já cadastrado', async () => {
      repository.findOneBy!.mockResolvedValue(existingUser());

      await expect(
        service.create({
          name: 'Outro',
          email: 'cesar@celke.com.br',
          password: 'Senha@123',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  it('findOne lança NotFound para id inexistente', async () => {
    repository.findOneBy!.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  describe('update', () => {
    it('impede que o usuário altere o próprio papel', async () => {
      repository.findOneBy!.mockResolvedValue(existingUser());

      await expect(service.update(1, { role: Role.User }, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('impede que o usuário desative a si mesmo', async () => {
      repository.findOneBy!.mockResolvedValue(existingUser());

      await expect(service.setActive(1, false, 1)).rejects.toThrow(
        'Você não pode desativar a si mesmo.',
      );
    });

    it('redefine a senha com hash e invalida os tokens quando password é informado', async () => {
      repository.findOneBy!.mockResolvedValue(existingUser({ id: 2 }));

      await service.update(2, { password: 'NovaSenha@1' }, 1);

      expect(repository.update).toHaveBeenCalledWith(2, {
        password: 'hashed-password',
      });
      expect(repository.increment).toHaveBeenCalledWith(
        { id: 2 },
        'tokenVersion',
        1,
      );
    });
  });

  it('remove impede que o usuário exclua a si mesmo', async () => {
    await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
    expect(repository.remove).not.toHaveBeenCalled();
  });
});
