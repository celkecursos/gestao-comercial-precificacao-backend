import { PartialType } from '@nestjs/swagger';
import { CreatePricingFormulaDto } from './create-pricing-formula.dto';

export class UpdatePricingFormulaDto extends PartialType(
  CreatePricingFormulaDto,
) {}
