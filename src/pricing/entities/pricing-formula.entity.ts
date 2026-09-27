import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/app-base.entity';

/**
 * Fórmula de precificação. Nesta versão armazena apenas a identificação da fórmula;
 * os componentes (cotação, custo de transformação, despesas, margem...) serão modelados
 * futuramente e calculados pelo PricingCalculationService.
 */
@Entity('pricing_formulas')
@Index('UQ_pricing_formulas_name', ['name'], { unique: true })
export class PricingFormula extends AppBaseEntity {
  @ApiProperty({ example: 'Alumínio LME + Transformação' })
  @Column({ length: 120 })
  name: string;

  @ApiProperty({
    example: 'Cotação LME do alumínio + custo de transformação + margem',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ example: true })
  @Column({ default: true })
  active: boolean;
}
