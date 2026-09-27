import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { ProductsModule } from '../products/products.module';
import { QuotationsModule } from '../quotations/quotations.module';
import { UsersModule } from '../users/users.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [UsersModule, ProductsModule, QuotationsModule, PricingModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
