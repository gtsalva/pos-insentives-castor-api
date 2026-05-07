import { Type } from 'class-transformer';
import {
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { PaymentMethod } from '../entities/sale.entity';

export class CreateSaleItemDto {
  @IsUUID()
  product_id: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  unit_price?: number;
}

export class CreateSalePaymentDto {
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  payment_reference?: string;
}

export class CreateSaleDto {
  @IsUUID()
  client_id: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalePaymentDto)
  payments: CreateSalePaymentDto[];

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  payment_document_url?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  payment_receipt_url?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}
