import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsRepository } from './clients.repository';
import { Client } from './entities/client.entity';

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByNit: jest.fn(),
  update: jest.fn(),
  deactivate: jest.fn(),
};

describe('ClientsService', () => {
  let service: ClientsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: ClientsRepository, useValue: mockRepo },
      ],
    }).compile();
    service = module.get(ClientsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates client when NIT is unique', async () => {
      mockRepo.findByNit.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({
        client_id: 'c1',
        full_name: 'Juan',
        nit: '1234567-8',
      } as Client);

      const result = await service.create({
        full_name: 'Juan',
        nit: '1234567-8',
        billing_address: '6a Av. 5-10',
        billing_city: 'Guatemala',
        billing_department: 'Guatemala',
      });

      expect(result.client_id).toBe('c1');
      expect(mockRepo.create).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when NIT already exists', async () => {
      mockRepo.findByNit.mockResolvedValue({
        client_id: 'other',
        nit: '1234567-8',
      } as Client);

      await expect(
        service.create({
          full_name: 'Pedro',
          nit: '1234567-8',
          billing_address: '1a Av.',
          billing_city: 'Guatemala',
          billing_department: 'Guatemala',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates client without NIT (consumidor final)', async () => {
      mockRepo.create.mockResolvedValue({
        client_id: 'c2',
        full_name: 'Consumidor Final',
        nit: null,
      } as unknown as Client);

      const result = await service.create({
        full_name: 'Consumidor Final',
        billing_address: 'Ciudad de Guatemala',
        billing_city: 'Guatemala',
        billing_department: 'Guatemala',
      });

      expect(mockRepo.findByNit).not.toHaveBeenCalled();
      expect(result.client_id).toBe('c2');
    });
  });

  describe('findOne', () => {
    it('returns client when found', async () => {
      mockRepo.findOne.mockResolvedValue({ client_id: 'c1' } as Client);
      const result = await service.findOne('c1');
      expect(result.client_id).toBe('c1');
    });

    it('throws NotFoundException when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('none')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('throws ConflictException when new NIT belongs to another client', async () => {
      mockRepo.findOne.mockResolvedValue({ client_id: 'c1' } as Client);
      mockRepo.findByNit.mockResolvedValue({ client_id: 'c2' } as Client);

      await expect(
        service.update('c1', { nit: '9999999-9' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
