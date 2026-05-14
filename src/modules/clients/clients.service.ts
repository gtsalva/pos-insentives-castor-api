import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientsRepository } from './clients.repository';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientQueryDto } from './dto/client-query.dto';
import { Client } from './entities/client.entity';

export interface PaginatedClients {
  data: Client[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ClientsService {
  constructor(private readonly repo: ClientsRepository) {}

  async create(dto: CreateClientDto): Promise<Client> {
    if (dto.nit && dto.nit.toUpperCase() !== 'CF') {
      const existing = await this.repo.findByNit(dto.nit);
      if (existing) {
        throw new ConflictException(
          `Ya existe un cliente con NIT ${dto.nit}`,
        );
      }
    }
    return this.repo.create(dto);
  }

  async findAll(dto: ClientQueryDto): Promise<PaginatedClients> {
    const [data, total] = await this.repo.findAll(dto);
    return { data, total, page: dto.page ?? 1, limit: dto.limit ?? 20 };
  }

  async findOne(client_id: string): Promise<Client> {
    const client = await this.repo.findOne(client_id);
    if (!client) {
      throw new NotFoundException(`Cliente ${client_id} no encontrado`);
    }
    return client;
  }

  async update(client_id: string, dto: UpdateClientDto): Promise<Client> {
    await this.findOne(client_id);
    if (dto.nit && dto.nit.toUpperCase() !== 'CF') {
      const existing = await this.repo.findByNit(dto.nit);
      if (existing && existing.client_id !== client_id) {
        throw new ConflictException(
          `Ya existe un cliente con NIT ${dto.nit}`,
        );
      }
    }
    return this.repo.update(client_id, dto);
  }

  async updatePhoto(client_id: string, photo_url: string | null): Promise<Client> {
    await this.findOne(client_id);
    return this.repo.update(client_id, { photo_url } as UpdateClientDto);
  }

  async deactivate(client_id: string): Promise<void> {
    await this.findOne(client_id);
    return this.repo.deactivate(client_id);
  }
}
