import { IsDateString } from 'class-validator';

export class ApproveCustomOrderDto {
  @IsDateString()
  delivery_date: string;
}
