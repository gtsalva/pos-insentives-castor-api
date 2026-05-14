import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/create-supplier.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';
import { PaginatedResult } from '../products/products.service';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) {}

  async findAll(dto: SupplierQueryDto): Promise<PaginatedResult<Supplier>> {
    const { page = 1, limit = 20, search, is_active } = dto;
    const qb = this.supplierRepo.createQueryBuilder('s');

    if (search) {
      qb.where('(LOWER(s.name) LIKE :q OR LOWER(s.contact_name) LIKE :q)', {
        q: `%${search.toLowerCase()}%`,
      });
    }
    if (is_active !== undefined) {
      qb.andWhere('s.is_active = :active', { active: is_active });
    }

    const [data, total] = await qb
      .orderBy('s.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(supplier_id: string): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({ where: { supplier_id } });
    if (!supplier) throw new NotFoundException(`Proveedor ${supplier_id} no encontrado`);
    return supplier;
  }

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const supplier = this.supplierRepo.create(dto);
    return this.supplierRepo.save(supplier);
  }

  async update(supplier_id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(supplier_id);
    Object.assign(supplier, dto);
    return this.supplierRepo.save(supplier);
  }

  async updatePhoto(supplier_id: string, photo_url: string | null): Promise<Supplier> {
    await this.findOne(supplier_id);
    await this.supplierRepo.update({ supplier_id }, { photo_url });
    return this.findOne(supplier_id);
  }
}
