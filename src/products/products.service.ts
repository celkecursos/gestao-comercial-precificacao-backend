import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { toPaginatedResult, toSkipTake } from '../common/utils/pagination.util';
import { containsText } from '../common/utils/search.util';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async findAll(query: QueryProductsDto): Promise<PaginatedResult<Product>> {
    const filters: FindOptionsWhere<Product> = {};
    if (query.active !== undefined) filters.active = query.active;

    const where = query.search
      ? [
          { ...filters, name: containsText(query.search) },
          { ...filters, code: containsText(query.search) },
        ]
      : filters;

    const [data, total] = await this.productsRepository.findAndCount({
      where,
      order: { name: 'ASC' },
      ...toSkipTake(query),
    });
    return toPaginatedResult(data, total, query);
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOneBy({ id });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    await this.ensureCodeIsAvailable(dto.code);
    const product = this.productsRepository.create(dto);
    return this.productsRepository.save(product);
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    if (dto.code && dto.code !== product.code) {
      await this.ensureCodeIsAvailable(dto.code, id);
    }
    this.productsRepository.merge(product, dto);
    return this.productsRepository.save(product);
  }

  setActive(id: number, active: boolean): Promise<Product> {
    return this.update(id, { active });
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
  }

  count(): Promise<number> {
    return this.productsRepository.count();
  }

  private async ensureCodeIsAvailable(
    code: string,
    ignoreId?: number,
  ): Promise<void> {
    const existing = await this.productsRepository.findOneBy({ code });
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Já existe um produto com este código.');
    }
  }
}
