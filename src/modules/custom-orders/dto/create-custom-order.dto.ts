import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  MaxLength,
  IsEmail,
} from 'class-validator';

export class CreateCustomOrderItemDto {
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

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCustomOrderItemDto)
  items: CreateCustomOrderItemDto[];
}
