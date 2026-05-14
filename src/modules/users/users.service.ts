import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuditService, AuditActor } from '../audit/audit.service';

const USER_SELECT: (keyof User)[] = [
  'user_id', 'email', 'full_name', 'role', 'is_active', 'photo_url', 'created_at',
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

  async updatePhoto(user_id: string, photo_url: string, actor?: AuditActor): Promise<User> {
    const user = await this.findById(user_id);
    if (!user) throw new NotFoundException(`Usuario ${user_id} no encontrado`);
    await this.userRepo.update(user_id, { photo_url });
    const updated = (await this.userRepo.findOne({ where: { user_id }, select: USER_SELECT }))!;

    if (actor) {
      this.auditService.log({
        action: 'USER_PHOTO_UPDATED',
        entity_type: 'User',
        entity_id: user_id,
        actor,
        metadata: { photo_url },
      });
    }

    return updated;
  }

  async changePassword(user_id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password_hash')
      .where('u.user_id = :user_id', { user_id })
      .getOne();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const valid = await bcrypt.compare(dto.current_password, user.password_hash);
    if (!valid) throw new BadRequestException('La contraseña actual es incorrecta');
    const password_hash = await bcrypt.hash(dto.new_password, 10);
    await this.userRepo.update(user_id, { password_hash });
  }

  async toggleStatus(user_id: string, actor?: AuditActor): Promise<User> {
    const currentUser = await this.findById(user_id);
    if (!currentUser) throw new NotFoundException(`Usuario ${user_id} no encontrado`);
    await this.userRepo.update(user_id, { is_active: !currentUser.is_active });
    const updated = (await this.userRepo.findOne({ where: { user_id }, select: USER_SELECT }))!;

    if (actor) {
      this.auditService.log({
        action: 'USER_STATUS_CHANGED',
        entity_type: 'User',
        entity_id: user_id,
        actor,
        metadata: { active: !currentUser.is_active },
      });
    }

    return updated;
  }
}
