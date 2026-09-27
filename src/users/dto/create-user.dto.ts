import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';
import {
  trim,
  trimLowerCase,
} from '../../common/transformers/string.transformers';
import { IsStrongPassword } from '../../common/validators/is-strong-password.decorator';
import { PASSWORD_DESCRIPTION } from '../../common/validators/password.rules';

export class CreateUserDto {
  @ApiProperty({ example: 'Maria Souza', minLength: 2, maxLength: 120 })
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  name: string;

  @ApiProperty({ example: 'maria@empresa.com.br', maxLength: 180 })
  @Transform(trimLowerCase)
  @IsEmail()
  @MaxLength(180)
  email: string;

  @ApiProperty({ example: 'Senha@123', description: PASSWORD_DESCRIPTION })
  @IsStrongPassword()
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.User })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
