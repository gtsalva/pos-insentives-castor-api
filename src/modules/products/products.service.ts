import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';

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
    const product = await this.productRepo.findOne({ where: { product_id } });
    if (!product) throw new NotFoundException(`Producto ${product_id} no encontrado`);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }
}
