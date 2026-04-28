import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { MovementType } from '../entities/inventory-movement.entity';

export class AdjustStockDto {
  @IsUUID()
  product_id: string;

  @IsEnum(MovementType)
  movement_type: MovementType;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  supplier_id?: string;
}
