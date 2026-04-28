import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InventoryService } from './inventory.service';
import { InventoryMovement, MovementType } from './entities/inventory-movement.entity';
import { Product } from '../products/entities/product.entity';

describe('InventoryService', () => {
  let service: InventoryService;

  const savedMovement = { movement_id: 'm1', supplier_id: 'sup1' };
  const mockManager = {
    findOne: jest.fn().mockResolvedValue({ product_id: 'p1', stock: 10, is_active: true }),
    increment: jest.fn().mockResolvedValue(undefined),
    decrement: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockReturnValue(savedMovement),
    save: jest.fn().mockResolvedValue(savedMovement),
  };
  const mockDataSource = {
    transaction: jest.fn().mockImplementation((cb: (m: typeof mockManager) => Promise<unknown>) =>
      cb(mockManager),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(InventoryMovement), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: {} },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();
    service = module.get(InventoryService);
  });

  it('adjust stores supplier_id on movement', async () => {
    await service.adjust(
      { product_id: 'p1', movement_type: MovementType.IN, quantity: 5, supplier_id: 'sup1' },
      'user1',
    );
    expect(mockManager.create).toHaveBeenCalledWith(
      InventoryMovement,
      expect.objectContaining({ supplier_id: 'sup1' }),
    );
  });
});
