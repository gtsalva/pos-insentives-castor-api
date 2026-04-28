import {
  IsUUID,
  IsOptional,
  IsString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsInt,
  Min,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PurchaseItemDto {
  @ApiProperty()
  @IsUUID()
  product_id: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity_ordered: number;

  @ApiProperty({ description: 'Costo unitario de compra', minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  unit_cost: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsUUID()
  supplier_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}
