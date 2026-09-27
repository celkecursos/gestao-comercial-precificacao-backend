import { ApiProperty } from '@nestjs/swagger';

export enum DashboardCardKey {
  Users = 'users',
  Products = 'products',
  Quotations = 'quotations',
  PricingFormulas = 'pricingFormulas',
}

export class DashboardCardDto {
  @ApiProperty({ enum: DashboardCardKey, example: DashboardCardKey.Products })
  key: DashboardCardKey;

  @ApiProperty({ example: 'Produtos' })
  title: string;

  @ApiProperty({ example: 12 })
  value: number;
}

export class DashboardResponseDto {
  @ApiProperty({ type: [DashboardCardDto] })
  cards: DashboardCardDto[];

  @ApiProperty({ example: '2026-09-26T12:00:00.000Z' })
  generatedAt: string;
}
