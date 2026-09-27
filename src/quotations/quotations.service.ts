import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { toPaginatedResult, toSkipTake } from '../common/utils/pagination.util';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { QueryQuotationsDto } from './dto/query-quotations.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { Quotation } from './entities/quotation.entity';
import { QuotationSource } from './enums/quotation-source.enum';

@Injectable()
export class QuotationsService {
  constructor(
    @InjectRepository(Quotation)
    private readonly quotationsRepository: Repository<Quotation>,
  ) {}

  async findAll(
    query: QueryQuotationsDto,
  ): Promise<PaginatedResult<Quotation>> {
    const where: FindOptionsWhere<Quotation> = {};
    if (query.commodity) where.commodity = query.commodity;
    if (query.source) where.source = query.source;

    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);
    if (dateFilter) where.date = dateFilter;

    const [data, total] = await this.quotationsRepository.findAndCount({
      where,
      order: { date: 'DESC', commodity: 'ASC' },
      ...toSkipTake(query),
    });
    return toPaginatedResult(data, total, query);
  }

  async findOne(id: number): Promise<Quotation> {
    const quotation = await this.quotationsRepository.findOneBy({ id });
    if (!quotation) throw new NotFoundException('Cotação não encontrada.');
    return quotation;
  }

  async create(dto: CreateQuotationDto): Promise<Quotation> {
    const data = { ...dto, source: dto.source ?? QuotationSource.Manual };
    await this.ensureIsUnique(data.date, data.source, data.commodity);

    const quotation = this.quotationsRepository.create(data);
    const saved = await this.quotationsRepository.save(quotation);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateQuotationDto): Promise<Quotation> {
    const quotation = await this.findOne(id);
    this.quotationsRepository.merge(quotation, dto);
    await this.ensureIsUnique(
      quotation.date,
      quotation.source,
      quotation.commodity,
      id,
    );
    await this.quotationsRepository.save(quotation);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const quotation = await this.findOne(id);
    await this.quotationsRepository.remove(quotation);
  }

  count(): Promise<number> {
    return this.quotationsRepository.count();
  }

  private buildDateFilter(startDate?: string, endDate?: string) {
    if (startDate && endDate) {
      if (startDate > endDate) {
        throw new BadRequestException(
          'startDate deve ser menor ou igual a endDate.',
        );
      }
      return Between(startDate, endDate);
    }
    if (startDate) return MoreThanOrEqual(startDate);
    if (endDate) return LessThanOrEqual(endDate);
    return undefined;
  }

  private async ensureIsUnique(
    date: string,
    source: QuotationSource,
    commodity: string,
    ignoreId?: number,
  ): Promise<void> {
    const existing = await this.quotationsRepository.findOneBy({
      date,
      source,
      commodity,
    });
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException(
        'Já existe uma cotação para esta data, fonte e commodity.',
      );
    }
  }
}
