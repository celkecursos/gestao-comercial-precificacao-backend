import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual } from 'typeorm';
import {
  createRepositoryMock,
  RepositoryMock,
} from '../../test/utils/repository.mock';
import { Quotation } from './entities/quotation.entity';
import { QuotationSource } from './enums/quotation-source.enum';
import { QuotationsService } from './quotations.service';

describe('QuotationsService', () => {
  let service: QuotationsService;
  let repository: RepositoryMock<Quotation>;

  const dto = {
    date: '2026-09-25',
    commodity: 'ALUMINIUM',
    value: 2495,
    currency: 'USD',
    unit: 'T',
  };

  beforeEach(async () => {
    repository = createRepositoryMock<Quotation>();
    repository.findAndCount!.mockResolvedValue([[], 0]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        QuotationsService,
        { provide: getRepositoryToken(Quotation), useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(QuotationsService);
  });

  describe('create', () => {
    it('cadastra a cotação com fonte MANUAL por padrão', async () => {
      repository.findOneBy!.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 1,
        ...dto,
        source: QuotationSource.Manual,
      });

      const quotation = await service.create(dto);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ ...dto, source: QuotationSource.Manual }),
      );
      expect(quotation.source).toBe(QuotationSource.Manual);
    });

    it('rejeita cotação duplicada para a mesma data, fonte e commodity', async () => {
      repository.findOneBy!.mockResolvedValue({ id: 9, ...dto });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('filtra por período e commodity', async () => {
      await service.findAll({
        page: 1,
        limit: 20,
        commodity: 'COPPER',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      });

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            commodity: 'COPPER',
            date: Between('2026-09-01', '2026-09-30'),
          },
        }),
      );
    });

    it('aceita apenas a data inicial', async () => {
      await service.findAll({ page: 1, limit: 20, startDate: '2026-09-01' });

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { date: MoreThanOrEqual('2026-09-01') },
        }),
      );
    });

    it('rejeita período com data inicial maior que a final', async () => {
      await expect(
        service.findAll({
          page: 1,
          limit: 20,
          startDate: '2026-09-30',
          endDate: '2026-09-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
