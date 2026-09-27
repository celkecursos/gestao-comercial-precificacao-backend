import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateUserDto, payload);
  const errors = await validate(dto);
  return { dto, invalidFields: errors.map((error) => error.property) };
}

describe('CreateUserDto (validação de usuário)', () => {
  const validPayload = {
    name: 'Maria Souza',
    email: 'maria@empresa.com.br',
    password: '123456A#b',
  };

  it('aceita um usuário válido', async () => {
    const { invalidFields } = await validateDto(validPayload);
    expect(invalidFields).toEqual([]);
  });

  it('normaliza o e-mail (trim + minúsculas) e o nome (trim)', async () => {
    const { dto } = await validateDto({
      ...validPayload,
      name: '  Maria  ',
      email: '  MARIA@Empresa.com.BR ',
    });
    expect(dto.name).toBe('Maria');
    expect(dto.email).toBe('maria@empresa.com.br');
  });

  it('rejeita e-mail inválido', async () => {
    const { invalidFields } = await validateDto({
      ...validPayload,
      email: 'invalido',
    });
    expect(invalidFields).toEqual(['email']);
  });

  it.each([
    ['curta', 'Ab1#'],
    ['sem maiúscula', 'abcdef1#'],
    ['sem número', 'Abcdefg#'],
    ['sem caractere especial', 'Abcdefg1'],
  ])('rejeita senha fraca (%s)', async (_case, password) => {
    const { invalidFields } = await validateDto({ ...validPayload, password });
    expect(invalidFields).toEqual(['password']);
  });

  it('rejeita papel inexistente', async () => {
    const { invalidFields } = await validateDto({
      ...validPayload,
      role: 'SUPERUSER',
    });
    expect(invalidFields).toEqual(['role']);
  });

  it('exige nome, e-mail e senha', async () => {
    const { invalidFields } = await validateDto({});
    expect(invalidFields.sort()).toEqual(['email', 'name', 'password']);
  });
});
