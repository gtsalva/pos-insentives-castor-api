import { IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'SOF-001' })
  @IsString()
  @MinLength(2)
  sku: string;

  @ApiProperty({ example: 'Sofá de 3 plazas' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 2500.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unit_price: number;

  @ApiProperty({ required: false, example: 1800.00, description: 'Precio de costo (compra)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cost_price?: number;

  @ApiProperty({ required: false, example: 2000.00, description: 'Precio mínimo de venta' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  min_sale_price?: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock: number;

  @ApiProperty({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  min_stock?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  category_id?: string;
}
