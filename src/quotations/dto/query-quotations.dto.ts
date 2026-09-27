import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { trimUpperCase } from '../../common/transformers/string.transformers';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator';
import { QuotationSource } from '../enums/quotation-source.enum';

export class QueryQuotationsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: '2026-09-01',
    format: 'date',
    description: 'Data inicial (inclusive)',
  })
  @IsOptional()
  @IsDateOnly()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-09-30',
    format: 'date',
    description: 'Data final (inclusive)',
  })
  @IsOptional()
  @IsDateOnly()
  endDate?: string;

  @ApiPropertyOptional({ example: 'ALUMINIUM' })
  @IsOptional()
  @Transform(trimUpperCase)
  @IsString()
  commodity?: string;

  @ApiPropertyOptional({ enum: QuotationSource })
  @IsOptional()
  @IsEnum(QuotationSource)
  source?: QuotationSource;
}
