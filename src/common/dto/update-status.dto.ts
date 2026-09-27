import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Corpo usado pelos endpoints de ativação/desativação (`PATCH /:recurso/:id/status`). */
export class UpdateStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  active: boolean;
}
