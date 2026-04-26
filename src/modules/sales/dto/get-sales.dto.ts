import { IsEnum, IsOptional, IsUUID, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, SaleStatus } from '../entities/sale.entity';

export class GetSalesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;

  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @IsOptional()
  @IsUUID()
  salesperson_id?: string;
}
