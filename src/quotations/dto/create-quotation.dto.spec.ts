import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateQuotationDto } from './create-quotation.dto';

async function invalidFields(payload: Record<string, unknown>) {
  const errors = await validate(plainToInstance(CreateQuotationDto, payload));
  return errors.map((error) => error.property);
}

describe('CreateQuotationDto', () => {
  const valid = {
    date: '2026-09-25',
    commodity: 'aluminium',
    value: 2495.5,
    currency: 'usd',
    unit: 't',
  };

  it('aceita uma cotação válida e normaliza os textos', async () => {
    const dto = plainToInstance(CreateQuotationDto, valid);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({
      commodity: 'ALUMINIUM',
      currency: 'USD',
      unit: 'T',
    });
  });

  it.each(['25/09/2026', '2026-13-01', '2026-09-25T10:00:00Z'])(
    'rejeita data inválida (%s)',
    async (date) => {
      expect(await invalidFields({ ...valid, date })).toEqual(['date']);
    },
  );

  it('rejeita valor negativo ou com mais de 4 casas decimais', async () => {
    expect(await invalidFields({ ...valid, value: -1 })).toEqual(['value']);
    expect(await invalidFields({ ...valid, value: 1.12345 })).toEqual([
      'value',
    ]);
  });

  it('rejeita moeda fora do padrão ISO 4217', async () => {
    expect(await invalidFields({ ...valid, currency: 'XYZ' })).toEqual([
      'currency',
    ]);
  });
});
