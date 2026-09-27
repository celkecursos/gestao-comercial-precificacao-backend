import { Role } from '../../common/enums/role.enum';
import { QuotationSource } from '../../quotations/enums/quotation-source.enum';

/**
 * Dados FICTÍCIOS de demonstração. Não utilize estas credenciais em produção real.
 */
export const DEMO_PASSWORD = '123456A#b';

export const SEED_USERS = [
  { name: 'Cesar', email: 'cesar@celke.com.br', role: Role.Admin },
  { name: 'Kelly', email: 'kelly@celke.com.br', role: Role.User },
];

export const SEED_PRODUCTS = [
  {
    code: 'AL-VG-095',
    name: 'Vergalhão de Alumínio 9,5mm',
    description: 'Vergalhão de alumínio liga 1350 para condutores elétricos.',
    unit: 'KG',
  },
  {
    code: 'AL-CB-CA-35',
    name: 'Cabo de Alumínio CA 35mm²',
    description: 'Cabo de alumínio nu, classe CA, seção 35mm².',
    unit: 'M',
  },
  {
    code: 'AL-CB-CAA-4AWG',
    name: 'Cabo de Alumínio CAA 4 AWG',
    description: 'Cabo de alumínio com alma de aço, bitola 4 AWG.',
    unit: 'M',
  },
  {
    code: 'CU-FIO-2.5',
    name: 'Fio de Cobre 2,5mm²',
    description: 'Fio de cobre eletrolítico, seção 2,5mm².',
    unit: 'M',
  },
  {
    code: 'AL-LG-6063',
    name: 'Lingote de Alumínio 6063',
    description: 'Lingote de alumínio liga 6063 para extrusão.',
    unit: 'T',
  },
];

export const SEED_QUOTATIONS = [
  { date: '2026-09-21', commodity: 'ALUMINIUM', value: 2465.5 },
  { date: '2026-09-22', commodity: 'ALUMINIUM', value: 2478.0 },
  { date: '2026-09-23', commodity: 'ALUMINIUM', value: 2471.25 },
  { date: '2026-09-24', commodity: 'ALUMINIUM', value: 2489.75 },
  { date: '2026-09-25', commodity: 'ALUMINIUM', value: 2495.0 },
  { date: '2026-09-21', commodity: 'COPPER', value: 9820.0 },
  { date: '2026-09-22', commodity: 'COPPER', value: 9855.5 },
  { date: '2026-09-23', commodity: 'COPPER', value: 9790.25 },
  { date: '2026-09-24', commodity: 'COPPER', value: 9812.0 },
  { date: '2026-09-25', commodity: 'COPPER', value: 9868.75 },
].map((quotation) => ({
  ...quotation,
  source: QuotationSource.Manual,
  currency: 'USD',
  unit: 'T',
}));

export const SEED_PRICING_FORMULAS = [
  {
    name: 'Alumínio LME + Transformação',
    description:
      'Cotação do alumínio + custo de transformação + despesas + margem comercial.',
  },
  {
    name: 'Cobre LME + Transformação',
    description:
      'Cotação do cobre + custo de transformação + despesas + margem comercial.',
  },
  {
    name: 'Preço Fixo com Hedge',
    description:
      'Preço travado com base em contrato de hedge (estrutura para uso futuro).',
  },
];
