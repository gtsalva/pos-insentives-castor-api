import { IsOptional, IsString } from 'class-validator';

export class ReopenShiftDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
