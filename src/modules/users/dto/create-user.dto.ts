import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'vendedor@castor.gt' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Contraseña123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  full_name: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;
}
