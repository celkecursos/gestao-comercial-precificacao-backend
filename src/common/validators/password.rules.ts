/**
 * Política de senha do sistema, reutilizada em todos os pontos onde uma senha é definida
 * (criação de usuário, troca de senha e futuras funcionalidades, como a recuperação de senha).
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // limite do bcrypt

export const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const PASSWORD_PATTERN_MESSAGE =
  'A senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais.';

export const PASSWORD_DESCRIPTION = `Mínimo de ${PASSWORD_MIN_LENGTH} caracteres, com letras maiúsculas, minúsculas, números e caracteres especiais.`;
