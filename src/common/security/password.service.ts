import * as bcrypt from 'bcrypt';

/**
 * Hash e verificação de senhas com bcrypt.
 * Classe simples (sem dependências do Nest) para poder ser usada também pelos seeds.
 */
export class PasswordService {
  constructor(private readonly saltRounds: number) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
