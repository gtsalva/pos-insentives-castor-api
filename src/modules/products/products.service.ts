import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductResource, ResourceType } from './entities/product-resource.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { CreateProductResourceDto } from './dto/create-product-resource.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductResource)
    private readonly resourceRepo: Repository<ProductResource>,
  ) {}

  async search(dto: SearchProductDto): Promise<PaginatedResult<Product>> {
    const { query, category_id, page = 1, limit = 20 } = dto;
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .where('p.is_active = :active', { active: true });

    if (query) {
      qb.andWhere('(LOWER(p.name) LIKE :q OR LOWER(p.sku) LIKE :q)', {
        q: `%${query.toLowerCase()}%`,
      });
    }
    if (category_id) {
      qb.andWhere('p.category_id = :category_id', { category_id });
    }

    const [data, total] = await qb
      .orderBy('p.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findById(product_id: string): Promise<Product> {
    const p = await this.productRepo.findOne({
      where: { product_id, is_active: true },
      relations: ['category'],
    });
    if (!p) throw new NotFoundException(`Producto ${product_id} no encontrado`);
    return p;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const p = this.productRepo.create(dto);
    return this.productRepo.save(p);
  }

  async update(product_id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { product_id, is_active: true } });
    if (!product) throw new NotFoundException(`Producto ${product_id} no encontrado`);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(product_id: string): Promise<void> {
    const product = await this.productRepo.findOne({ where: { product_id, is_active: true } });
    if (!product) throw new NotFoundException(`Producto ${product_id} no encontrado`);
    product.is_active = false;
    await this.productRepo.save(product);
  }

  async listResources(product_id: string): Promise<ProductResource[]> {
    await this.findById(product_id);
    return this.resourceRepo.find({
      where: { product_id },
      order: { sort_order: 'ASC', created_at: 'ASC' },
    });
  }

  async addResource(
    product_id: string,
    dto: CreateProductResourceDto,
  ): Promise<ProductResource> {
    await this.findById(product_id);

    let sortOrder = dto.sort_order;
    if (sortOrder === undefined) {
      const max = await this.resourceRepo.maximum('sort_order', { product_id });
      sortOrder = max !== null ? (max as number) + 1 : 0;
    }

    const resource = this.resourceRepo.create({
      product_id,
      url: dto.url,
      resource_type: dto.resource_type,
      sort_order: sortOrder,
    });
    const saved = await this.resourceRepo.save(resource);

    if (saved.resource_type === 'image' && saved.sort_order === 0) {
      await this.productRepo.update(product_id, { image_url: saved.url });
    }

    return saved;
  }

  async deleteResource(product_id: string, resource_id: string): Promise<void> {
    const product = await this.findById(product_id);
    const resource = await this.resourceRepo.findOne({
      where: { resource_id, product_id },
    });
    if (!resource) throw new NotFoundException(`Recurso ${resource_id} no encontrado`);

    await this.resourceRepo.remove(resource);

    if (resource.resource_type === 'image' && product.image_url === resource.url) {
      const next = await this.resourceRepo.findOne({
        where: { product_id, resource_type: 'image' as ResourceType },
        order: { sort_order: 'ASC' },
      });
      await this.productRepo.update(product_id, { image_url: next?.url ?? null });
    }
  }

  async setDefaultResource(product_id: string, resource_id: string): Promise<ProductResource[]> {
    await this.findById(product_id);

    const queryRunner = this.resourceRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let newFeaturedUrl: string | null = null;
    let newFeaturedIsImage = false;

    try {
      const resources = await queryRunner.manager.find(ProductResource, { where: { product_id } });
      const target = resources.find(r => r.resource_id === resource_id);
      if (!target) throw new NotFoundException(`Recurso ${resource_id} no encontrado`);

      newFeaturedUrl = target.url;
      newFeaturedIsImage = target.resource_type === 'image';

      const rest = resources
        .filter(r => r.resource_id !== resource_id)
        .sort((a, b) => a.sort_order - b.sort_order);

      const updates = [
        { ...target, sort_order: 0 },
        ...rest.map((r, i) => ({ ...r, sort_order: i + 1 })),
      ];
      await queryRunner.manager.save(ProductResource, updates);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    if (newFeaturedIsImage && newFeaturedUrl) {
      await this.productRepo.update(product_id, { image_url: newFeaturedUrl });
    }

    return this.listResources(product_id);
  }

  async checkSku(
    sku: string,
    exclude_id?: string,
  ): Promise<{ available: boolean; used_by_deleted: boolean }> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('LOWER(p.sku) = LOWER(:sku)', { sku });

    if (exclude_id) {
      qb.andWhere('p.product_id != :exclude_id', { exclude_id });
    }

    const existing = await qb.getOne();

    if (!existing) return { available: true, used_by_deleted: false };
    if (!existing.is_active) return { available: false, used_by_deleted: true };
    return { available: false, used_by_deleted: false };
  }

  async findDeleted(dto: SearchProductDto): Promise<PaginatedResult<Product>> {
    const { query, page = 1, limit = 20 } = dto;
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .where('p.is_active = :active', { active: false });

    if (query) {
      qb.andWhere('(LOWER(p.name) LIKE :q OR LOWER(p.sku) LIKE :q)', {
        q: `%${query.toLowerCase()}%`,
      });
    }

    const [data, total] = await qb
      .orderBy('p.updated_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async restore(product_id: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { product_id, is_active: false },
    });
    if (!product) {
      throw new NotFoundException(`Producto ${product_id} no encontrado en eliminados`);
    }
    product.is_active = true;
    return this.productRepo.save(product);
  }

  async permanentRemove(product_id: string): Promise<void> {
    const product = await this.productRepo.findOne({
      where: { product_id, is_active: false },
    });
    if (!product) {
      throw new NotFoundException(`Producto ${product_id} no encontrado en eliminados`);
    }

    const [saleCount, purchaseCount, movementCount] = await Promise.all([
      this.productRepo.manager.query<[{ count: string }]>(
        'SELECT COUNT(*)::int AS count FROM sale_items WHERE product_id = $1',
        [product_id],
      ),
      this.productRepo.manager.query<[{ count: string }]>(
        'SELECT COUNT(*)::int AS count FROM purchase_order_items WHERE product_id = $1',
        [product_id],
      ),
      this.productRepo.manager.query<[{ count: string }]>(
        'SELECT COUNT(*)::int AS count FROM inventory_movements WHERE product_id = $1',
        [product_id],
      ),
    ]);

    const total =
      Number(saleCount[0].count) +
      Number(purchaseCount[0].count) +
      Number(movementCount[0].count);

    if (total > 0) {
      throw new ConflictException(
        `No se puede eliminar: el producto tiene ${total} registro(s) asociado(s) en ventas, compras o movimientos`,
      );
    }

    await this.resourceRepo.delete({ product_id });
    await this.productRepo.remove(product);
  }
}
