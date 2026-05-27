import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { CreateProductResourceDto } from './dto/create-product-resource.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.SALESPERSON)
  search(@Query() dto: SearchProductDto) {
    return this.productsService.search(dto);
  }

  @Get('check-sku')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Verificar disponibilidad de SKU' })
  checkSku(@Query('sku') sku: string, @Query('exclude_id') exclude_id?: string) {
    if (!sku || sku.trim().length < 2) {
      throw new BadRequestException('El parámetro sku debe tener al menos 2 caracteres');
    }
    return this.productsService.checkSku(sku, exclude_id);
  }

  @Get('deleted')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar productos eliminados (soft-delete)' })
  findDeleted(@Query() dto: SearchProductDto) {
    return this.productsService.findDeleted(dto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.SALESPERSON)
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Post(':id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Restaurar producto eliminado' })
  restore(@Param('id') id: string) {
    return this.productsService.restore(id);
  }

  @Delete(':id/permanent')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar definitivamente (solo si no tiene registros asociados)' })
  permanentRemove(@Param('id') id: string) {
    return this.productsService.permanentRemove(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar (desactivar) producto — solo ADMIN' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Get(':id/resources')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar recursos del producto' })
  listResources(@Param('id') id: string) {
    return this.productsService.listResources(id);
  }

  @Post(':id/resources')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Agregar recurso al producto' })
  addResource(@Param('id') id: string, @Body() dto: CreateProductResourceDto) {
    return this.productsService.addResource(id, dto);
  }

  @Delete(':id/resources/:resourceId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Eliminar recurso del producto' })
  deleteResource(
    @Param('id') id: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.productsService.deleteResource(id, resourceId);
  }

  @Patch(':id/resources/:resourceId/set-default')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Establecer recurso como imagen por defecto' })
  setDefaultResource(
    @Param('id') id: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.productsService.setDefaultResource(id, resourceId);
  }
}
