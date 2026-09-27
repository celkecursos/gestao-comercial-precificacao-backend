import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quotation } from './entities/quotation.entity';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';

/**
 * Cotações diárias. Integrações externas (ex.: LmeQuotationService) devem implementar
 * `QuotationProvider` (./providers) e ser registradas em `providers`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Quotation])],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
