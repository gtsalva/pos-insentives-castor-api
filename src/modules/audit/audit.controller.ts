import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuditLog } from './entities/audit-log.entity';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  async findAll(@Query() dto: GetAuditLogsDto) {
    const { action, performed_by_id, entity_type, date_from, date_to, page = 1, limit = 50 } = dto;
    const qb = this.auditRepo.createQueryBuilder('a').orderBy('a.created_at', 'DESC');

    if (action) qb.andWhere('a.action = :action', { action });
    if (performed_by_id) qb.andWhere('a.performed_by_id = :performed_by_id', { performed_by_id });
    if (entity_type) qb.andWhere('a.entity_type = :entity_type', { entity_type });
    if (date_from) {
      const start = new Date(date_from);
      qb.andWhere('a.created_at >= :date_from', { date_from: start });
    }
    if (date_to) {
      const end = new Date(date_to);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('a.created_at <= :date_to', { date_to: end });
    }

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }
}
