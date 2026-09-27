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
import { Role } from '../common/enums/role.enum';
import {
  ApiErrorResponses,
  ApiPaginatedResponse,
} from '../common/swagger/api-responses.decorator';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { QueryQuotationsDto } from './dto/query-quotations.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { Quotation } from './entities/quotation.entity';
import { QuotationsService } from './quotations.service';

@ApiTags('Cotações')
@ApiBearerAuth()
@ApiErrorResponses(HttpStatus.UNAUTHORIZED)
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista cotações (paginado, filtros por período, commodity e fonte)',
  })
  @ApiPaginatedResponse(Quotation)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  findAll(@Query() query: QueryQuotationsDto) {
    return this.quotationsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta uma cotação' })
  @ApiOkResponse({ type: Quotation })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quotationsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra uma cotação' })
  @ApiCreatedResponse({ type: Quotation })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  create(@Body() dto: CreateQuotationDto) {
    return this.quotationsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma cotação' })
  @ApiOkResponse({ type: Quotation })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuotationDto,
  ) {
    return this.quotationsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui uma cotação (somente ADMIN)' })
  @ApiNoContentResponse({ description: 'Cotação excluída' })
  @ApiErrorResponses(HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.quotationsService.remove(id);
  }
}
