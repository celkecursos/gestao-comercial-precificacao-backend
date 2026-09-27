import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  trim,
  trimUpperCase,
} from '../../common/transformers/string.transformers';

export class CreateProductDto {
  @ApiProperty({ example: 'Vergalhão de Alumínio 9,5mm', maxLength: 150 })
  @Transform(trim)
  @IsString()
  @Length(2, 150)
  name: string;

  @ApiProperty({
    example: 'AL-VG-095',
    maxLength: 50,
    description: 'Letras, números, ".", "_" e "-". Convertido para maiúsculas.',
  })
  @Transform(trimUpperCase)
  @IsString()
  @Length(1, 50)
  @Matches(/^[A-Z0-9._-]+$/, {
    message: 'code deve conter apenas letras, números, ".", "_" ou "-".',
  })
  code: string;

  @ApiPropertyOptional({ example: 'Vergalhão de alumínio liga 1350' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 'KG', maxLength: 20 })
  @Transform(trimUpperCase)
  @IsString()
  @Length(1, 20)
  unit: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
