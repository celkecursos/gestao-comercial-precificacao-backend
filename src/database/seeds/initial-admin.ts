import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { PasswordService } from '../../common/security/password.service';
import { User } from '../../users/entities/user.entity';

export interface InitialAdminData {
  name: string;
  email: string;
  password: string;
}

export type InitialAdminResult = 'created' | 'skipped';

/**
 * Garante que o sistema tenha um administrador para o primeiro acesso.
 *
 * - Se já existe algum usuário ADMIN, nada é feito (a senha nunca é sobrescrita).
 * - Caso contrário, cria o administrador com os dados informados.
 * - Se o e-mail já pertence a um usuário que não é ADMIN, lança erro em vez de promovê-lo
 *   silenciosamente.
 */
export async function ensureInitialAdmin(
  dataSource: DataSource,
  data: InitialAdminData,
  saltRounds = 10,
): Promise<InitialAdminResult> {
  const email = data.email.trim().toLowerCase();

  return dataSource.transaction(async (manager) => {
    if (await manager.existsBy(User, { role: Role.Admin })) return 'skipped';

    if (await manager.existsBy(User, { email })) {
      throw new Error(
        `ADMIN_EMAIL (${email}) já pertence a um usuário que não é administrador. ` +
          'Informe outro e-mail ou altere o perfil desse usuário.',
      );
    }

    const password = await new PasswordService(saltRounds).hash(data.password);
    await manager.insert(User, {
      name: data.name.trim(),
      email,
      password,
      role: Role.Admin,
      active: true,
    });
    return 'created';
  });
}
