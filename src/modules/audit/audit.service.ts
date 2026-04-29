import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';

export interface AuditActor { id: string; name: string; }
export interface LogParams {
  action: string;
  entity_type?: string;
  entity_id?: string;
  actor: AuditActor;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  log(params: LogParams): void {
    const entry = this.auditRepo.create({
      action: params.action,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      performed_by_id: params.actor.id,
      performed_by_name: params.actor.name,
      metadata: params.metadata ?? null,
    });
    this.auditRepo.save(entry).catch((err) =>
      this.logger.error('Failed to save audit log', err),
    );
  }

  async findAll(dto: GetAuditLogsDto) {
    const { action, performed_by_id, entity_type, date_from, date_to, page = 1, limit = 50 } = dto;
    const qb = this.auditRepo.createQueryBuilder('a').orderBy('a.created_at', 'DESC');

    if (action) qb.andWhere('a.action = :action', { action });
    if (performed_by_id) qb.andWhere('a.performed_by_id = :performed_by_id', { performed_by_id });
    if (entity_type) qb.andWhere('a.entity_type = :entity_type', { entity_type });
    if (date_from) {
      qb.andWhere('a.created_at >= :date_from', { date_from: new Date(`${date_from}T00:00:00.000Z`) });
    }
    if (date_to) {
      qb.andWhere('a.created_at <= :date_to', { date_to: new Date(`${date_to}T23:59:59.999Z`) });
    }

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }
}
