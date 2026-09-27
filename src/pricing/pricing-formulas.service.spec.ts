import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  createRepositoryMock,
  RepositoryMock,
} from '../../test/utils/repository.mock';
import { PricingFormula } from './entities/pricing-formula.entity';
import { PricingFormulasService } from './pricing-formulas.service';

describe('PricingFormulasService', () => {
  let service: PricingFormulasService;
  let repository: RepositoryMock<PricingFormula>;

  const dto = {
    name: 'Alumínio LME + Transformação',
    description: 'Cotação + transformação + margem',
  };

  beforeEach(async () => {
    repository = createRepositoryMock<PricingFormula>();

    const moduleRef = await Test.createTestingModule({
      providers: [
        PricingFormulasService,
        { provide: getRepositoryToken(PricingFormula), useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(PricingFormulasService);
  });

  it('cria uma fórmula com nome disponível', async () => {
    repository.findOneBy!.mockResolvedValue(null);

    const formula = await service.create(dto);

    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining(dto));
    expect(formula).toMatchObject(dto);
  });

  it('rejeita nome duplicado', async () => {
    repository.findOneBy!.mockResolvedValue({ id: 3, ...dto });

    await expect(service.create(dto)).rejects.toThrow(ConflictException);
  });

  it('permite atualizar mantendo o mesmo nome', async () => {
    repository.findOneBy!.mockResolvedValue({ id: 1, active: true, ...dto });

    const formula = await service.update(1, { ...dto, active: false });

    expect(formula.active).toBe(false);
  });

  it('lança NotFound ao excluir fórmula inexistente', async () => {
    repository.findOneBy!.mockResolvedValue(null);
    await expect(service.remove(42)).rejects.toThrow(NotFoundException);
  });
});
