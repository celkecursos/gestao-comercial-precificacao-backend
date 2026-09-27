import { applyDecorators } from '@nestjs/common';
import { IsString, Length, Matches } from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_PATTERN_MESSAGE,
} from './password.rules';

/** Aplica a política de senha do sistema a uma propriedade de DTO. */
export function IsStrongPassword() {
  return applyDecorators(
    IsString(),
    Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH),
    Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE }),
  );
}
