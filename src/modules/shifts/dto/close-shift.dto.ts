import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CloseShiftDto {
  @IsOptional()
  @IsUUID()
  salesperson_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
