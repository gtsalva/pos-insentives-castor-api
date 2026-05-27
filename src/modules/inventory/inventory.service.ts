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
import { AuditService } from '../audit/audit.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
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
      relations: ['user', 'supplier'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getSummary(): Promise<{
    total_cost_value: number;
    total_sale_value: number;
    low_stock_count: number;
  }> {
    const rows = await this.productRepo.manager.query<[{
      total_cost_value: string;
      total_sale_value: string;
      low_stock_count: string;
    }]>(
      `SELECT
        COALESCE(SUM(stock * COALESCE(cost_price, 0)), 0)::numeric(14,2) AS total_cost_value,
        COALESCE(SUM(stock * unit_price), 0)::numeric(14,2)             AS total_sale_value,
        COUNT(*) FILTER (WHERE stock <= min_stock)::int                  AS low_stock_count
       FROM products
       WHERE is_active = true`,
    );
    const row = rows[0];
    return {
      total_cost_value: Number(row.total_cost_value),
      total_sale_value: Number(row.total_sale_value),
      low_stock_count:  Number(row.low_stock_count),
    };
  }

  async adjust(dto: AdjustStockDto, created_by: string, created_by_name: string): Promise<InventoryMovement> {
    const movement = await this.dataSource.transaction(async (manager) => {
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

      const newMovement = manager.create(InventoryMovement, {
        product_id: dto.product_id,
        movement_type: dto.movement_type,
        quantity: dto.quantity,
        notes: dto.notes,
        supplier_id: dto.supplier_id ?? null,
        created_by,
      });

      return manager.save(InventoryMovement, newMovement);
    });

    this.auditService.log({
      action: 'INVENTORY_ADJUSTED',
      entity_type: 'InventoryMovement',
      entity_id: movement.movement_id,
      actor: { id: created_by, name: created_by_name },
      metadata: { product_id: dto.product_id, movement_type: dto.movement_type, quantity: dto.quantity },
    });

    return movement;
  }
}
