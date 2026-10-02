import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetMessageDto {
  @ApiProperty({
    example:
      'Se o e-mail estiver cadastrado e ativo, enviaremos as instruções para redefinir a senha.',
  })
  message: string;
}
