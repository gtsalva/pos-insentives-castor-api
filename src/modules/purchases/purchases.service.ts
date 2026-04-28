import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PurchaseOrder, PurchaseStatus } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { Product } from '../products/entities/product.entity';
import { InventoryMovement, MovementType } from '../inventory/entities/inventory-movement.entity';
import { SuppliersService } from '../suppliers/suppliers.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';
import { ReceivePurchaseDto } from './dto/receive-purchase.dto';
import { PaginatedResult } from '../products/products.service';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly itemRepo: Repository<PurchaseOrderItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly suppliersService: SuppliersService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(dto: PurchaseQueryDto): Promise<PaginatedResult<PurchaseOrder>> {
    const { page = 1, limit = 20, status, supplier_id } = dto;
    const qb = this.purchaseRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.ordered_by_user', 'ordered_by_user');

    if (status) qb.andWhere('po.status = :status', { status });
    if (supplier_id) qb.andWhere('po.supplier_id = :supplier_id', { supplier_id });

    const [data, total] = await qb
      .orderBy('po.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(purchase_order_id: string): Promise<PurchaseOrder> {
    const po = await this.purchaseRepo.findOne({
      where: { purchase_order_id },
      relations: ['supplier', 'items', 'ordered_by_user', 'received_by_user'],
    });
    if (!po) throw new NotFoundException(`Orden ${purchase_order_id} no encontrada`);
    return po;
  }

  async create(dto: CreatePurchaseOrderDto, ordered_by: string): Promise<PurchaseOrder> {
    await this.suppliersService.findOne(dto.supplier_id);

    return this.dataSource.transaction(async (manager) => {
      let total_cost = 0;
      const itemsData: Partial<PurchaseOrderItem>[] = [];

      for (const item of dto.items) {
        const product = await manager.findOne(Product, {
          where: { product_id: item.product_id, is_active: true },
        });
        if (!product) {
          throw new NotFoundException(`Producto ${item.product_id} no encontrado`);
        }
        const subtotal = item.unit_cost * item.quantity_ordered;
        total_cost += subtotal;
        itemsData.push({
          product_id: product.product_id,
          product_sku: product.sku,
          product_name: product.name,
          quantity_ordered: item.quantity_ordered,
          unit_cost: item.unit_cost,
          subtotal,
          min_sale_price: item.min_sale_price ?? null,
          unit_price: item.unit_price ?? null,
        });
      }

      const order_number = await this.generateOrderNumber(manager);
      const po = manager.create(PurchaseOrder, {
        order_number,
        supplier_id: dto.supplier_id,
        notes: dto.notes,
        ordered_by,
        total_cost,
        status: PurchaseStatus.PENDING,
      });
      const savedPo = await manager.save(PurchaseOrder, po);

      const items = itemsData.map((i) =>
        manager.create(PurchaseOrderItem, {
          ...i,
          purchase_order_id: savedPo.purchase_order_id,
        }),
      );
      await manager.save(PurchaseOrderItem, items);

      return manager.findOne(PurchaseOrder, {
        where: { purchase_order_id: savedPo.purchase_order_id },
        relations: ['supplier', 'items', 'ordered_by_user'],
      }) as Promise<PurchaseOrder>;
    });
  }

  async receive(
    purchase_order_id: string,
    dto: ReceivePurchaseDto,
    received_by: string,
  ): Promise<PurchaseOrder> {
    return this.dataSource.transaction(async (manager) => {
      const po = await manager.findOne(PurchaseOrder, {
        where: { purchase_order_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!po) throw new NotFoundException(`Orden ${purchase_order_id} no encontrada`);
      if (po.status !== PurchaseStatus.PENDING) {
        throw new ConflictException(
          `La orden está en estado ${po.status} y no puede recibirse`,
        );
      }
      po.items = await manager.find(PurchaseOrderItem, { where: { purchase_order_id } });

      for (const receivedItem of dto.items) {
        const item = po.items.find(
          (i) => i.purchase_item_id === receivedItem.purchase_item_id,
        );
        if (!item) {
          throw new NotFoundException(
            `Ítem ${receivedItem.purchase_item_id} no pertenece a esta orden`,
          );
        }
        if (receivedItem.quantity_received === 0) continue;

        await manager.increment(
          Product,
          { product_id: item.product_id },
          'stock',
          receivedItem.quantity_received,
        );

        if (item.unit_price != null || item.min_sale_price != null) {
          const priceUpdate: Partial<Product> = { cost_price: item.unit_cost };
          if (item.unit_price != null)     priceUpdate.unit_price     = item.unit_price;
          if (item.min_sale_price != null) priceUpdate.min_sale_price = item.min_sale_price;
          await manager.update(Product, { product_id: item.product_id }, priceUpdate);
        }

        await manager.save(
          InventoryMovement,
          manager.create(InventoryMovement, {
            product_id: item.product_id,
            movement_type: MovementType.IN,
            quantity: receivedItem.quantity_received,
            notes: `Recepción orden ${po.order_number}`,
            reference_id: purchase_order_id,
            supplier_id: po.supplier_id,
            created_by: received_by,
          }),
        );

        await manager.update(PurchaseOrderItem, { purchase_item_id: item.purchase_item_id }, {
          quantity_received: receivedItem.quantity_received,
        });
      }

      await manager.update(PurchaseOrder, { purchase_order_id }, {
        status: PurchaseStatus.RECEIVED,
        received_by,
        received_at: new Date(),
      });

      return manager.findOne(PurchaseOrder, {
        where: { purchase_order_id },
        relations: ['supplier', 'items', 'ordered_by_user', 'received_by_user'],
      }) as Promise<PurchaseOrder>;
    });
  }

  async cancel(
    purchase_order_id: string,
    cancellation_reason: string,
  ): Promise<PurchaseOrder> {
    const po = await this.findOne(purchase_order_id);
    if (po.status !== PurchaseStatus.PENDING) {
      throw new ConflictException(
        `Solo se pueden cancelar órdenes PENDIENTES. Estado actual: ${po.status}`,
      );
    }
    await this.purchaseRepo.update({ purchase_order_id }, {
      status: PurchaseStatus.CANCELLED,
      cancellation_reason,
    });
    return this.findOne(purchase_order_id);
  }

  private async generateOrderNumber(manager: import('typeorm').EntityManager): Promise<string> {
    const count = await manager.count(PurchaseOrder);
    return `OC-${String(count + 1).padStart(6, '0')}`;
  }
}
