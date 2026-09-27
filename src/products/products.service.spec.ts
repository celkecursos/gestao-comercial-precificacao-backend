import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  createRepositoryMock,
  RepositoryMock,
} from '../../test/utils/repository.mock';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: RepositoryMock<Product>;

  const dto = {
    name: 'Vergalhão de Alumínio 9,5mm',
    code: 'AL-VG-095',
    unit: 'KG',
  };

  beforeEach(async () => {
    repository = createRepositoryMock<Product>();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
  });

  describe('create', () => {
    it('cria um produto com código disponível', async () => {
      repository.findOneBy!.mockResolvedValue(null);

      const product = await service.create(dto);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining(dto),
      );
      expect(product).toMatchObject({ id: 1, ...dto });
    });

    it('rejeita código duplicado', async () => {
      repository.findOneBy!.mockResolvedValue({ id: 5, ...dto });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('rejeita alteração para um código usado por outro produto', async () => {
      repository
        .findOneBy!.mockResolvedValueOnce({ id: 1, ...dto })
        .mockResolvedValueOnce({ id: 2, code: 'CU-FIO-2.5' });

      await expect(service.update(1, { code: 'CU-FIO-2.5' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('desativa o produto', async () => {
      repository.findOneBy!.mockResolvedValue({ id: 1, active: true, ...dto });

      const product = await service.setActive(1, false);

      expect(product.active).toBe(false);
    });
  });

  it('findOne lança NotFound para id inexistente', async () => {
    repository.findOneBy!.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('findAll retorna dados paginados', async () => {
    repository.findAndCount!.mockResolvedValue([[{ id: 1, ...dto }], 41]);

    const result = await service.findAll({ page: 2, limit: 20 });

    expect(repository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
    expect(result.meta).toEqual({
      page: 2,
      limit: 20,
      total: 41,
      totalPages: 3,
    });
  });
});
