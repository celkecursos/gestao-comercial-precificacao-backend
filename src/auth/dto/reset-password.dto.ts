import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/is-strong-password.decorator';
import { PASSWORD_DESCRIPTION } from '../../common/validators/password.rules';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'q3Jx0m3e6l3nR0Yz6m8X1v0Tq2c9b7Kd4f5g6h7i8jA',
    description: 'Token recebido no link do e-mail (parâmetro `token`)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token: string;

  @ApiProperty({ example: 'NovaSenha@2026', description: PASSWORD_DESCRIPTION })
  @IsStrongPassword()
  newPassword: string;
}
