import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, Index } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { Role } from '../../common/enums/role.enum';

@Entity('users')
@Index('UQ_users_email', ['email'], { unique: true })
export class User extends AppBaseEntity {
  @ApiProperty({ example: 'Cesar' })
  @Column({ length: 120 })
  name: string;

  @ApiProperty({ example: 'cesar@celke.com.br' })
  @Column({ length: 180 })
  email: string;

  /** Hash bcrypt. Nunca é retornado pela API nem carregado por padrão nas consultas. */
  @ApiHideProperty()
  @Exclude()
  @Column({ length: 255, select: false })
  password: string;

  @ApiProperty({ enum: Role, example: Role.User })
  @Column({ type: 'varchar', length: 30, default: Role.User })
  role: Role;

  @ApiProperty({ example: true })
  @Column({ default: true })
  active: boolean;

  /**
   * Incrementado no logout e na troca de senha para invalidar os tokens JWT já emitidos.
   */
  @ApiHideProperty()
  @Exclude()
  @Column({ name: 'token_version', type: 'int', unsigned: true, default: 0 })
  tokenVersion: number;
}
