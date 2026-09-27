import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingCalculationService } from './calculation/pricing-calculation.service';
import { PricingFormula } from './entities/pricing-formula.entity';
import { PricingFormulasController } from './pricing-formulas.controller';
import { PricingFormulasService } from './pricing-formulas.service';

@Module({
  imports: [TypeOrmModule.forFeature([PricingFormula])],
  controllers: [PricingFormulasController],
  providers: [PricingFormulasService, PricingCalculationService],
  exports: [PricingFormulasService, PricingCalculationService],
})
export class PricingModule {}
