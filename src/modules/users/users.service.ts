import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditService, AuditActor } from '../audit/audit.service';

const USER_SELECT: (keyof User)[] = [
  'user_id', 'email', 'full_name', 'role', 'is_active', 'created_at',
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findByEmailWithHash(email: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password_hash')
      .where('u.email = :email', { email })
      .getOne();
  }

  async findById(user_id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { user_id } });
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({ select: USER_SELECT });
  }

  async create(dto: CreateUserDto, actor?: AuditActor): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('El correo ya está registrado');
    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({ ...dto, password_hash });
    const saved = await this.userRepo.save(user);
    const { password_hash: _, ...result } = saved;

    if (actor) {
      this.auditService.log({
        action: 'USER_CREATED',
        entity_type: 'User',
        entity_id: saved.user_id,
        actor,
        metadata: { email: dto.email, role: dto.role },
      });
    }

    return result as User;
  }

  async update(user_id: string, dto: UpdateUserDto, actor?: AuditActor): Promise<User> {
    const user = await this.findById(user_id);
    if (!user) throw new NotFoundException(`Usuario ${user_id} no encontrado`);
    if (dto.email && dto.email !== user.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing) throw new ConflictException('El correo ya está registrado');
    }
    await this.userRepo.update(user_id, dto);
    const updated = (await this.userRepo.findOne({ where: { user_id }, select: USER_SELECT }))!;

    if (actor) {
      this.auditService.log({
        action: 'USER_UPDATED',
        entity_type: 'User',
        entity_id: user_id,
        actor,
        metadata: { changes: dto as Record<string, unknown> },
      });
    }

    return updated;
  }

  async toggleStatus(user_id: string): Promise<User> {
    const user = await this.findById(user_id);
    if (!user) throw new NotFoundException(`Usuario ${user_id} no encontrado`);
    await this.userRepo.update(user_id, { is_active: !user.is_active });
    return (await this.userRepo.findOne({ where: { user_id }, select: USER_SELECT }))!;
  }
}
