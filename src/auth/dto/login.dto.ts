import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { trimLowerCase } from '../../common/transformers/string.transformers';

export class LoginDto {
  @ApiProperty({ example: 'cesar@celke.com.br' })
  @Transform(trimLowerCase)
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456A#b' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
