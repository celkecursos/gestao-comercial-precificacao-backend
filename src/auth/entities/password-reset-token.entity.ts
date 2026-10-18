import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Pedido de redefinição de senha. O token enviado por e-mail nunca é gravado: só o seu
 * hash SHA-256 (o token é aleatório e longo, então o hash basta e permite a busca).
 * Expira em `expiresAt` e vale uma única vez (`usedAt`).
 */
@Entity('password_reset_tokens')
@Index('UQ_password_reset_tokens_token_hash', ['tokenHash'], { unique: true })
@Index('IDX_password_reset_tokens_user_id', ['userId'])
export class PasswordResetToken extends AppBaseEntity {
  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_password_reset_tokens_user_id',
  })
  user?: User;

  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'datetime', nullable: true })
  usedAt: Date | null;
}
