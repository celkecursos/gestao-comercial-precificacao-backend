import { Controller, Get, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../common/swagger/api-responses.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Totais para os cards do dashboard' })
  @ApiOkResponse({ type: DashboardResponseDto })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED)
  getSummary() {
    return this.dashboardService.getSummary();
  }
}
