import 'reflect-metadata';
import { DataSource, EntityManager } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { User } from '../../users/entities/user.entity';
import { ensureInitialAdmin } from './initial-admin';

describe('ensureInitialAdmin', () => {
  const data = {
    name: ' Admin Produção ',
    email: ' Admin@Empresa.com.br ',
    password: 'SenhaForte@2026',
  };

  let manager: { existsBy: jest.Mock; insert: jest.Mock };
  let dataSource: DataSource;

  beforeEach(() => {
    manager = { existsBy: jest.fn(), insert: jest.fn() };
    dataSource = {
      transaction: (work: (m: EntityManager) => Promise<unknown>) =>
        work(manager as unknown as EntityManager),
    } as unknown as DataSource;
  });

  it('cria o administrador quando não existe nenhum ADMIN', async () => {
    manager.existsBy.mockResolvedValue(false);

    const result = await ensureInitialAdmin(dataSource, data, 10);

    expect(result).toBe('created');
    expect(manager.insert).toHaveBeenCalledWith(
      User,
      expect.objectContaining({
        name: 'Admin Produção',
        email: 'admin@empresa.com.br',
        role: Role.Admin,
        active: true,
      }),
    );
    const { password } = manager.insert.mock.calls[0][1] as {
      password: string;
    };
    expect(password).not.toBe(data.password);
    expect(password).toMatch(/^\$2[aby]\$/); // hash bcrypt
  });

  it('não faz nada (nem altera a senha) quando já existe um ADMIN', async () => {
    manager.existsBy.mockResolvedValueOnce(true);

    const result = await ensureInitialAdmin(dataSource, data, 10);

    expect(result).toBe('skipped');
    expect(manager.existsBy).toHaveBeenCalledWith(User, { role: Role.Admin });
    expect(manager.insert).not.toHaveBeenCalled();
  });

  it('recusa um e-mail que já pertence a um usuário comum', async () => {
    manager.existsBy
      .mockResolvedValueOnce(false) // nenhum ADMIN
      .mockResolvedValueOnce(true); // e-mail já cadastrado

    await expect(ensureInitialAdmin(dataSource, data, 10)).rejects.toThrow(
      'já pertence a um usuário que não é administrador',
    );
    expect(manager.insert).not.toHaveBeenCalled();
  });
});
