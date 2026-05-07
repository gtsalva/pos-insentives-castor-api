import {
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '../../sales/entities/payment-method.enum';

export class RegisterPaymentDto {
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  payment_reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
