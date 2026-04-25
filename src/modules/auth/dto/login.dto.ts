import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@castor.gt' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Contraseña123' })
  @IsString()
  @MinLength(8)
  password: string;
}
