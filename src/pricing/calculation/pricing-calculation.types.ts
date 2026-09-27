/** Componente de custo adicional (ex.: frete, embalagem, impostos). */
export interface PricingComponent {
  key: string;
  label: string;
  amount: number;
}

/** Valores de entrada para o cálculo de preço, todos na mesma moeda e unidade. */
export interface PricingCalculationInput {
  /** Custo da matéria-prima (ex.: cotação LME convertida para a unidade de venda). */
  rawMaterialCost: number;
  /** Custo de transformação industrial. */
  transformationCost: number;
  /** Despesas operacionais/comerciais. */
  expenses: number;
  /** Margem desejada em percentual sobre o custo total (ex.: 12.5 = 12,5%). */
  marginPercent: number;
  /** Outros componentes de custo. */
  additionalComponents?: PricingComponent[];
}

export interface PricingCalculationResult {
  /** Soma de todos os componentes de custo. */
  totalCost: number;
  marginAmount: number;
  finalPrice: number;
  /** Detalhamento de cada componente considerado no cálculo. */
  breakdown: PricingComponent[];
}
