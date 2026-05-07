import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CustomOrderStatus } from '../entities/custom-order-status.enum';

export class CustomOrderQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsEnum(CustomOrderStatus)
  status?: CustomOrderStatus;

  @IsOptional()
  @IsUUID()
  salesperson_id?: string;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  exclude_cancelled?: boolean;
}
