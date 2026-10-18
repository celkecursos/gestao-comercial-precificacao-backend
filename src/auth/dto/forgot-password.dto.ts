import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';
import { trimLowerCase } from '../../common/transformers/string.transformers';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'kelly@celke.com.br' })
  @Transform(trimLowerCase)
  @IsEmail()
  email: string;
}
