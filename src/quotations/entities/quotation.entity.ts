import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';
import { QuotationSource } from '../enums/quotation-source.enum';

/** Cotação diária de uma commodity em uma fonte. Só existe uma cotação por data/fonte/commodity. */
@Entity('quotations')
@Index('UQ_quotations_date_source_commodity', ['date', 'source', 'commodity'], {
  unique: true,
})
@Index('IDX_quotations_commodity_date', ['commodity', 'date'])
export class Quotation extends AppBaseEntity {
  @ApiProperty({ example: '2026-09-25', format: 'date' })
  @Column({ type: 'date' })
  date: string;

  @ApiProperty({ enum: QuotationSource, example: QuotationSource.Manual })
  @Column({ type: 'varchar', length: 30, default: QuotationSource.Manual })
  source: QuotationSource;

  @ApiProperty({ example: 'ALUMINIUM' })
  @Column({ length: 60 })
  commodity: string;

  @ApiProperty({ example: 2450.5 })
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalTransformer,
  })
  value: number;

  @ApiProperty({ example: 'USD', description: 'Código ISO 4217' })
  @Column({ type: 'char', length: 3 })
  currency: string;

  @ApiProperty({ example: 'T', description: 'Unidade de medida da cotação' })
  @Column({ length: 20 })
  unit: string;
}
