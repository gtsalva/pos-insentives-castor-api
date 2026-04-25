import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(user_id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { user_id } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('El correo ya está registrado');
    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({ ...dto, password_hash });
    const saved = await this.userRepo.save(user);
    const { password_hash: _, ...result } = saved;
    return result as User;
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({ select: ['user_id', 'email', 'full_name', 'role', 'is_active', 'created_at'] });
  }
}
