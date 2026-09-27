import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/app-base.entity';

@Entity('products')
@Index('UQ_products_code', ['code'], { unique: true })
export class Product extends AppBaseEntity {
  @ApiProperty({ example: 'Vergalhão de Alumínio 9,5mm' })
  @Column({ length: 150 })
  name: string;

  @ApiProperty({ example: 'AL-VG-095', description: 'Código único do produto' })
  @Column({ length: 50 })
  code: string;

  @ApiProperty({ example: 'Vergalhão de alumínio liga 1350', nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ example: 'KG', description: 'Unidade de medida' })
  @Column({ length: 20 })
  unit: string;

  @ApiProperty({ example: true })
  @Column({ default: true })
  active: boolean;
}
