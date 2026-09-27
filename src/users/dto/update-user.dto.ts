import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/** Todos os campos são opcionais. Informar `password` redefine a senha do usuário (ação administrativa). */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
