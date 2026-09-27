import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/is-strong-password.decorator';
import { PASSWORD_DESCRIPTION } from '../../common/validators/password.rules';

export class ChangePasswordDto {
  @ApiProperty({ example: '123456A#b' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'NovaSenha@2026', description: PASSWORD_DESCRIPTION })
  @IsStrongPassword()
  newPassword: string;
}
