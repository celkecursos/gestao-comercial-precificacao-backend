import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO4217CurrencyCode,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';
import { trimUpperCase } from '../../common/transformers/string.transformers';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator';
import { QuotationSource } from '../enums/quotation-source.enum';

export class CreateQuotationDto {
  @ApiProperty({ example: '2026-09-25', format: 'date' })
  @IsDateOnly()
  date: string;

  @ApiPropertyOptional({
    enum: QuotationSource,
    default: QuotationSource.Manual,
  })
  @IsOptional()
  @IsEnum(QuotationSource)
  source?: QuotationSource;

  @ApiProperty({
    example: 'ALUMINIUM',
    description: 'Convertido para maiúsculas',
  })
  @Transform(trimUpperCase)
  @IsString()
  @Length(2, 60)
  commodity: string;

  @ApiProperty({ example: 2450.5, description: 'Até 4 casas decimais' })
  @IsNumber({ maxDecimalPlaces: 4, allowNaN: false, allowInfinity: false })
  @IsPositive()
  value: number;

  @ApiProperty({ example: 'USD', description: 'Código ISO 4217' })
  @Transform(trimUpperCase)
  @IsISO4217CurrencyCode()
  currency: string;

  @ApiProperty({
    example: 'T',
    description: 'Unidade de medida (ex.: T, KG, LB)',
  })
  @Transform(trimUpperCase)
  @IsString()
  @Length(1, 20)
  unit: string;
}
