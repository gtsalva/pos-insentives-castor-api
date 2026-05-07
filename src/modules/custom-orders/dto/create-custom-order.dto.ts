import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDateString,
  IsBoolean,
  Min,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  MaxLength,
  IsEmail,
} from 'class-validator';

export class CreateCustomOrderItemDto {
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsString()
  @MaxLength(300)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unit_price: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost_price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}

export class CreateCustomOrderDto {
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  client_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  client_phone?: string;

  @IsOptional()
  @IsEmail()
  client_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  client_notes?: string;

  @IsOptional()
  @IsUUID()
  supplier_id?: string;

  @IsOptional()
  @IsDateString()
  delivery_date?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  agreed_price?: number;

  @IsOptional()
  @IsBoolean()
  counts_for_incentive?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCustomOrderItemDto)
  items: CreateCustomOrderItemDto[];
}
