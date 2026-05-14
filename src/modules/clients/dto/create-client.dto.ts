import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiPropertyOptional({ example: '1234567-8' })
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nit?: string;

  @ApiPropertyOptional({ example: '1234567890101' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dpi?: string;

  @ApiProperty({ example: 'Juan Pérez López' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  full_name: string;

  @ApiPropertyOptional({ example: 'Muebles El Roble S.A.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  business_name?: string;

  @ApiPropertyOptional({ example: 'juan@example.com' })
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+502 5555-1234' })
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ example: '6a Av. 5-10 Zona 1' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  billing_address: string;

  @ApiProperty({ example: 'Guatemala' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  billing_city: string;

  @ApiProperty({ example: 'Guatemala' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  billing_department: string;
}
