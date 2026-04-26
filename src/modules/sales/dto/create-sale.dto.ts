import { Type } from 'class-transformer';
import {
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { PaymentMethod } from '../entities/sale.entity';

export class CreateSaleItemDto {
  @IsUUID()
  product_id: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateSaleDto {
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}
