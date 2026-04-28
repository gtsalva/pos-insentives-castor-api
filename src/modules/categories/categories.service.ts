import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
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

  async create(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.categoryRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Ya existe una categoría con ese nombre');
    const cat = this.categoryRepo.create(dto);
    return this.categoryRepo.save(cat);
  }

  async update(category_id: string, dto: UpdateCategoryDto): Promise<Category> {
    const cat = await this.findOne(category_id);
    if (dto.name && dto.name !== cat.name) {
      const conflict = await this.categoryRepo.findOne({ where: { name: dto.name } });
      if (conflict) throw new ConflictException('Ya existe una categoría con ese nombre');
    }
    Object.assign(cat, dto);
    return this.categoryRepo.save(cat);
  }
}
