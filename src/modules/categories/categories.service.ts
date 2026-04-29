import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AuditService, AuditActor } from '../audit/audit.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly auditService: AuditService,
  ) {}

  findAll(includeInactive = false): Promise<Category[]> {
    const where = includeInactive ? {} : { is_active: true };
    return this.categoryRepo.find({ where, order: { name: 'ASC' } });
  }

  async findOne(category_id: string): Promise<Category> {
    const cat = await this.categoryRepo.findOne({ where: { category_id } });
    if (!cat) throw new NotFoundException(`Categoría ${category_id} no encontrada`);
    return cat;
  }

  async create(dto: CreateCategoryDto, actor: AuditActor): Promise<Category> {
    const existing = await this.categoryRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Ya existe una categoría con ese nombre');
    const cat = this.categoryRepo.create(dto);
    const saved = await this.categoryRepo.save(cat);
    this.auditService.log({ action: 'CATEGORY_CREATED', entity_type: 'Category', entity_id: saved.category_id, actor, metadata: { name: saved.name } });
    return saved;
  }

  async update(category_id: string, dto: UpdateCategoryDto, actor: AuditActor): Promise<Category> {
    const cat = await this.findOne(category_id);
    if (dto.name && dto.name !== cat.name) {
      const conflict = await this.categoryRepo.findOne({ where: { name: dto.name } });
      if (conflict) throw new ConflictException('Ya existe una categoría con ese nombre');
    }
    Object.assign(cat, dto);
    const saved = await this.categoryRepo.save(cat);
    this.auditService.log({ action: 'CATEGORY_UPDATED', entity_type: 'Category', entity_id: category_id, actor, metadata: { name: saved.name } });
    return saved;
  }
}
