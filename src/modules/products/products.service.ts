import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductResource } from './entities/product-resource.entity';
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
    return this.resourceRepo.save(resource);
  }

  async deleteResource(product_id: string, resource_id: string): Promise<void> {
    const resource = await this.resourceRepo.findOne({
      where: { resource_id, product_id },
    });
    if (!resource) throw new NotFoundException(`Recurso ${resource_id} no encontrado`);
    await this.resourceRepo.remove(resource);
  }

  async setDefaultResource(product_id: string, resource_id: string): Promise<ProductResource[]> {
    const resources = await this.resourceRepo.find({ where: { product_id } });
    const target = resources.find(r => r.resource_id === resource_id);
    if (!target) throw new NotFoundException(`Recurso ${resource_id} no encontrado`);

    const updates = resources.map(r => ({
      ...r,
      sort_order: r.resource_id === resource_id ? 0 : r.sort_order + 1,
    }));
    await this.resourceRepo.save(updates);
    return this.listResources(product_id);
  }
}
