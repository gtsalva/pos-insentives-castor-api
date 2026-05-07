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
  IsDateString,
} from 'class-validator';
import { CreateCustomOrderItemDto } from './create-custom-order.dto';

export class UpdateCustomOrderDto {
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
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCustomOrderItemDto)
  items?: CreateCustomOrderItemDto[];
}
