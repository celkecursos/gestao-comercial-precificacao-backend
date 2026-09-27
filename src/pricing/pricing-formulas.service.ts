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
import { CreatePricingFormulaDto } from './dto/create-pricing-formula.dto';
import { QueryPricingFormulasDto } from './dto/query-pricing-formulas.dto';
import { UpdatePricingFormulaDto } from './dto/update-pricing-formula.dto';
import { PricingFormula } from './entities/pricing-formula.entity';

@Injectable()
export class PricingFormulasService {
  constructor(
    @InjectRepository(PricingFormula)
    private readonly formulasRepository: Repository<PricingFormula>,
  ) {}

  async findAll(
    query: QueryPricingFormulasDto,
  ): Promise<PaginatedResult<PricingFormula>> {
    const where: FindOptionsWhere<PricingFormula> = {};
    if (query.active !== undefined) where.active = query.active;
    if (query.search) where.name = containsText(query.search);

    const [data, total] = await this.formulasRepository.findAndCount({
      where,
      order: { name: 'ASC' },
      ...toSkipTake(query),
    });
    return toPaginatedResult(data, total, query);
  }

  async findOne(id: number): Promise<PricingFormula> {
    const formula = await this.formulasRepository.findOneBy({ id });
    if (!formula) {
      throw new NotFoundException('Fórmula de precificação não encontrada.');
    }
    return formula;
  }

  async create(dto: CreatePricingFormulaDto): Promise<PricingFormula> {
    await this.ensureNameIsAvailable(dto.name);
    const formula = this.formulasRepository.create(dto);
    return this.formulasRepository.save(formula);
  }

  async update(
    id: number,
    dto: UpdatePricingFormulaDto,
  ): Promise<PricingFormula> {
    const formula = await this.findOne(id);
    if (dto.name && dto.name !== formula.name) {
      await this.ensureNameIsAvailable(dto.name, id);
    }
    this.formulasRepository.merge(formula, dto);
    return this.formulasRepository.save(formula);
  }

  setActive(id: number, active: boolean): Promise<PricingFormula> {
    return this.update(id, { active });
  }

  async remove(id: number): Promise<void> {
    const formula = await this.findOne(id);
    await this.formulasRepository.remove(formula);
  }

  count(): Promise<number> {
    return this.formulasRepository.count();
  }

  private async ensureNameIsAvailable(
    name: string,
    ignoreId?: number,
  ): Promise<void> {
    const existing = await this.formulasRepository.findOneBy({ name });
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Já existe uma fórmula com este nome.');
    }
  }
}
