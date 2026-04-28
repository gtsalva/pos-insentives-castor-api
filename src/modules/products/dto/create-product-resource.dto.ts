import { IsEnum, IsString, IsOptional, IsInt, Min, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductResourceDto {
  @ApiProperty({ example: 'http://localhost:3001/api/storage/products/abc.jpg' })
  @IsUrl({ require_tld: false })
  url: string;

  @ApiProperty({ enum: ['image', 'pdf'] })
  @IsEnum(['image', 'pdf'])
  resource_type: 'image' | 'pdf';

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sort_order?: number;
}
