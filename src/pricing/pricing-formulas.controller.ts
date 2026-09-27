import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { Role } from '../common/enums/role.enum';
import {
  ApiErrorResponses,
  ApiPaginatedResponse,
} from '../common/swagger/api-responses.decorator';
import { CreatePricingFormulaDto } from './dto/create-pricing-formula.dto';
import { QueryPricingFormulasDto } from './dto/query-pricing-formulas.dto';
import { UpdatePricingFormulaDto } from './dto/update-pricing-formula.dto';
import { PricingFormula } from './entities/pricing-formula.entity';
import { PricingFormulasService } from './pricing-formulas.service';

@ApiTags('Fórmulas de Precificação')
@ApiBearerAuth()
@ApiErrorResponses(HttpStatus.UNAUTHORIZED)
@Controller('pricing-formulas')
export class PricingFormulasController {
  constructor(private readonly formulasService: PricingFormulasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista fórmulas de precificação (paginado)' })
  @ApiPaginatedResponse(PricingFormula)
  findAll(@Query() query: QueryPricingFormulasDto) {
    return this.formulasService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta uma fórmula' })
  @ApiOkResponse({ type: PricingFormula })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.formulasService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma fórmula' })
  @ApiCreatedResponse({ type: PricingFormula })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  create(@Body() dto: CreatePricingFormulaDto) {
    return this.formulasService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma fórmula' })
  @ApiOkResponse({ type: PricingFormula })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePricingFormulaDto,
  ) {
    return this.formulasService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Ativa ou desativa uma fórmula' })
  @ApiOkResponse({ type: PricingFormula })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.formulasService.setActive(id, dto.active);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui uma fórmula (somente ADMIN)' })
  @ApiNoContentResponse({ description: 'Fórmula excluída' })
  @ApiErrorResponses(HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.formulasService.remove(id);
  }
}
