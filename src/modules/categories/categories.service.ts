import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.categoryRepo.find({ where: { is_active: true }, order: { name: 'ASC' } });
  }

  async findOne(category_id: string): Promise<Category> {
    const cat = await this.categoryRepo.findOne({ where: { category_id, is_active: true } });
    if (!cat) throw new NotFoundException(`Categoría ${category_id} no encontrada`);
    return cat;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.categoryRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Ya existe una categoría con ese nombre');
    const cat = this.categoryRepo.create(dto);
    return this.categoryRepo.save(cat);
  }
}
