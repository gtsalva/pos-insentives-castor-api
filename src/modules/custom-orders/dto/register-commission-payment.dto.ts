import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class RegisterCommissionPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
