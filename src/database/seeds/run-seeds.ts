import { DataSource } from 'typeorm';
import { PasswordService } from '../../common/security/password.service';
import { PricingFormula } from '../../pricing/entities/pricing-formula.entity';
import { Product } from '../../products/entities/product.entity';
import { Quotation } from '../../quotations/entities/quotation.entity';
import { User } from '../../users/entities/user.entity';
import {
  DEMO_PASSWORD,
  SEED_PRICING_FORMULAS,
  SEED_PRODUCTS,
  SEED_QUOTATIONS,
  SEED_USERS,
} from './seed-data';

/**
 * Popula o banco com dados de demonstração. É idempotente: registros já existentes
 * (mesmo e-mail, código, nome ou data/fonte/commodity) não são duplicados nem alterados.
 */
export async function runSeeds(
  dataSource: DataSource,
  saltRounds = 10,
): Promise<void> {
  const passwordService = new PasswordService(saltRounds);
  const demoPasswordHash = await passwordService.hash(DEMO_PASSWORD);

  await dataSource.transaction(async (manager) => {
    for (const user of SEED_USERS) {
      if (!(await manager.existsBy(User, { email: user.email }))) {
        await manager.insert(User, { ...user, password: demoPasswordHash });
      }
    }

    for (const product of SEED_PRODUCTS) {
      if (!(await manager.existsBy(Product, { code: product.code }))) {
        await manager.insert(Product, product);
      }
    }

    for (const quotation of SEED_QUOTATIONS) {
      const { date, source, commodity } = quotation;
      if (!(await manager.existsBy(Quotation, { date, source, commodity }))) {
        await manager.insert(Quotation, quotation);
      }
    }

    for (const formula of SEED_PRICING_FORMULAS) {
      if (!(await manager.existsBy(PricingFormula, { name: formula.name }))) {
        await manager.insert(PricingFormula, formula);
      }
    }
  });
}
