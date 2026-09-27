import { PartialType, PickType } from '@nestjs/swagger';
import { CreateUserDto } from '../../users/dto/create-user.dto';

/** Dados que o próprio usuário pode alterar no seu perfil. Papel e status só podem ser alterados por um ADMIN. */
export class UpdateProfileDto extends PartialType(
  PickType(CreateUserDto, ['name', 'email'] as const),
) {}
