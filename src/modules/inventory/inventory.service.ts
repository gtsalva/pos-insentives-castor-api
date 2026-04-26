import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InventoryMovement, MovementType } from './entities/inventory-movement.entity';
import { Product } from '../products/entities/product.entity';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { GetInventoryDto } from './dto/get-inventory.dto';
import { PaginatedResult } from '../products/products.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async getAll(dto: GetInventoryDto): Promise<PaginatedResult<Product>> {
    const { page = 1, limit = 20, low_stock } = dto;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .where('p.is_active = :active', { active: true });

    if (low_stock) {
      qb.andWhere('p.stock <= p.min_stock');
    }

    const [data, total] = await qb
      .orderBy('p.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async getMovements(product_id: string, page = 1, limit = 20): Promise<PaginatedResult<InventoryMovement>> {
    const product = await this.productRepo.findOne({ where: { product_id } });
    if (!product) throw new NotFoundException(`Producto ${product_id} no encontrado`);

    const [data, total] = await this.movementRepo.findAndCount({
      where: { product_id },
      relations: ['user'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async adjust(dto: AdjustStockDto, created_by: string): Promise<InventoryMovement> {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { product_id: dto.product_id, is_active: true },
      });
      if (!product) throw new NotFoundException(`Producto ${dto.product_id} no encontrado`);

      if (dto.movement_type === MovementType.OUT) {
        if (product.stock < dto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente: disponible ${product.stock}`,
          );
        }
        await manager.decrement(Product, { product_id: dto.product_id }, 'stock', dto.quantity);
      } else if (dto.movement_type === MovementType.IN) {
        await manager.increment(Product, { product_id: dto.product_id }, 'stock', dto.quantity);
      } else {
        await manager.update(Product, { product_id: dto.product_id }, { stock: dto.quantity });
      }

      const movement = manager.create(InventoryMovement, {
        product_id: dto.product_id,
        movement_type: dto.movement_type,
        quantity: dto.quantity,
        notes: dto.notes,
        created_by,
      });

      return manager.save(InventoryMovement, movement);
    });
  }
}
