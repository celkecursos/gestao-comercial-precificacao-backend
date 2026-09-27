import { BadRequestException } from '@nestjs/common';
import { PricingCalculationService } from './pricing-calculation.service';

describe('PricingCalculationService', () => {
  const service = new PricingCalculationService();

  it('calcula o preço pelo método custo + margem', () => {
    const result = service.calculate({
      rawMaterialCost: 2500,
      transformationCost: 800,
      expenses: 200,
      marginPercent: 10,
    });

    expect(result.totalCost).toBe(3500);
    expect(result.marginAmount).toBe(350);
    expect(result.finalPrice).toBe(3850);
    expect(result.breakdown.map((item) => item.key)).toEqual([
      'rawMaterialCost',
      'transformationCost',
      'expenses',
    ]);
  });

  it('considera componentes adicionais e arredonda para 4 casas decimais', () => {
    const result = service.calculate({
      rawMaterialCost: 0.1,
      transformationCost: 0.2,
      expenses: 0,
      marginPercent: 12.5,
      additionalComponents: [{ key: 'freight', label: 'Frete', amount: 0.3 }],
    });

    expect(result.totalCost).toBe(0.6);
    expect(result.marginAmount).toBe(0.075);
    expect(result.finalPrice).toBe(0.675);
    expect(result.breakdown).toHaveLength(4);
  });

  it('rejeita componentes negativos', () => {
    expect(() =>
      service.calculate({
        rawMaterialCost: 100,
        transformationCost: -1,
        expenses: 0,
        marginPercent: 10,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejeita margem negativa', () => {
    expect(() =>
      service.calculate({
        rawMaterialCost: 100,
        transformationCost: 0,
        expenses: 0,
        marginPercent: -5,
      }),
    ).toThrow('A margem deve ser um percentual não negativo.');
  });
});
