import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../common/decorators/public.decorator';

/** Verificação de saúde para monitoramento e plataformas de hospedagem. */
@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({
    summary: 'Verifica se a API e o banco de dados estão disponíveis',
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        database: 'up',
        timestamp: '2026-09-26T12:00:00.000Z',
      },
    },
  })
  @ApiServiceUnavailableResponse({ description: 'Banco de dados indisponível' })
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Banco de dados indisponível.');
    }
    return {
      status: 'ok',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
