import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStoreSettingsDto {
  @ApiProperty({ example: 'Mueblería El Castor' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  store_name: string;
}
