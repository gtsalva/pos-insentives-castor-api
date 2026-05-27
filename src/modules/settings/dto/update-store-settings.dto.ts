import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStoreSettingsDto {
  @ApiProperty({ example: 'Mueblería El Castor' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  store_name: string;

  @ApiPropertyOptional({ example: 20, description: 'Margen de precio mínimo (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  min_price_margin?: number;

  @ApiPropertyOptional({ example: 35, description: 'Margen de precio de venta (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  sale_price_margin?: number;
}
