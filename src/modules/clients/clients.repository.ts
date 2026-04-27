import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientQueryDto } from './dto/client-query.dto';

@Injectable()
export class ClientsRepository {
  constructor(
    @InjectRepository(Client)
    private readonly repo: Repository<Client>,
  ) {}

  create(dto: CreateClientDto): Promise<Client> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(dto: ClientQueryDto): Promise<[Client[], number]> {
    const { page = 1, limit = 20, search } = dto;
    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.is_active = true');

    if (search) {
      qb.andWhere(
        '(c.full_name ILIKE :s OR c.nit ILIKE :s OR c.business_name ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    return qb
      .orderBy('c.full_name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  findOne(client_id: string): Promise<Client | null> {
    return this.repo.findOne({ where: { client_id } });
  }

  findByNit(nit: string): Promise<Client | null> {
    return this.repo.findOne({ where: { nit } });
  }

  async update(client_id: string, dto: UpdateClientDto): Promise<Client> {
    await this.repo.update({ client_id }, dto);
    return this.findOne(client_id) as Promise<Client>;
  }

  deactivate(client_id: string): Promise<void> {
    return this.repo
      .update({ client_id }, { is_active: false })
      .then(() => undefined);
  }
}
