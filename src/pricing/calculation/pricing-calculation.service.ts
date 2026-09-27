import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PricingCalculationInput,
  PricingCalculationResult,
  PricingComponent,
} from './pricing-calculation.types';

const DECIMAL_PLACES = 4;

/**
 * Motor de cálculo de preços, isolado de controllers e da persistência.
 *
 * Implementa hoje a regra base "custo + margem":
 *   custo total = matéria-prima + transformação + despesas + componentes adicionais
 *   preço final = custo total × (1 + margem% / 100)
 *
 * Evoluções previstas: obter a matéria-prima a partir das cotações (QuotationsService),
 * ler os componentes de uma PricingFormula e considerar contratos de hedge.
 */
@Injectable()
export class PricingCalculationService {
  calculate(input: PricingCalculationInput): PricingCalculationResult {
    const breakdown: PricingComponent[] = [
      {
        key: 'rawMaterialCost',
        label: 'Matéria-prima',
        amount: input.rawMaterialCost,
      },
      {
        key: 'transformationCost',
        label: 'Custo de transformação',
        amount: input.transformationCost,
      },
      { key: 'expenses', label: 'Despesas', amount: input.expenses },
      ...(input.additionalComponents ?? []),
    ];

    this.validate(breakdown, input.marginPercent);

    const totalCost = breakdown.reduce((sum, item) => sum + item.amount, 0);
    const marginAmount = (totalCost * input.marginPercent) / 100;

    return {
      totalCost: this.round(totalCost),
      marginAmount: this.round(marginAmount),
      finalPrice: this.round(totalCost + marginAmount),
      breakdown,
    };
  }

  private validate(components: PricingComponent[], marginPercent: number) {
    const invalid = components.find(
      (item) => !Number.isFinite(item.amount) || item.amount < 0,
    );
    if (invalid) {
      throw new BadRequestException(
        `O componente "${invalid.label}" deve ser um valor numérico não negativo.`,
      );
    }
    if (!Number.isFinite(marginPercent) || marginPercent < 0) {
      throw new BadRequestException(
        'A margem deve ser um percentual não negativo.',
      );
    }
  }

  private round(value: number): number {
    const factor = 10 ** DECIMAL_PLACES;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}
