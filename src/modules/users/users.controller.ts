import { Controller, Get, Post, Patch, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/password')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.SALESPERSON)
  @ApiOperation({ summary: 'Cambiar contraseña del usuario autenticado' })
  async changeMyPassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(user.sub, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.create(dto, { id: user.sub, name: user.name });
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  toggleStatus(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.toggleStatus(id, { id: user.sub, name: user.name });
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.update(id, dto, { id: user.sub, name: user.name });
  }
}
