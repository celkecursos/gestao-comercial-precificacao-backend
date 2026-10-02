import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';
import { trimLowerCase } from '../../common/transformers/string.transformers';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'maria@empresa.com.br', maxLength: 180 })
  @Transform(trimLowerCase)
  @IsEmail()
  @MaxLength(180)
  email: string;
}
