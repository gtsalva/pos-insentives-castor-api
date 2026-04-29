import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateReconciliationDto {
  @IsNumber()
  @Min(0)
  cash_counted: number;

  @IsNumber()
  @Min(0)
  card_counted: number;

  @IsNumber()
  @Min(0)
  transfer_counted: number;

  @IsNumber()
  @Min(0)
  other_counted: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
