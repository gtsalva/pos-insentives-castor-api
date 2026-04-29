import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

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
      console.error('[AuditService] failed to save:', err),
    );
  }
}
