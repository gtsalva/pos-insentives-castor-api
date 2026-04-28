import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';

describe('ProductsService', () => {
  let service: ProductsService;
  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[{ product_id: '1', name: 'Sofá' }], 1]),
  };
  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: mockRepo },
      ],
    }).compile();
    service = module.get(ProductsService);
  });

  it('search returns paginated products', async () => {
    const result = await service.search({ query: 'sofá', page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('update returns updated product with price fields', async () => {
    const existing = { product_id: 'p1', name: 'Sofá', unit_price: 2500, cost_price: null, min_sale_price: null };
    mockRepo.findOne.mockResolvedValue(existing);
    mockRepo.save.mockResolvedValue({ ...existing, cost_price: 1500, min_sale_price: 2000 });
    const result = await service.update('p1', { cost_price: 1500, min_sale_price: 2000 });
    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { product_id: 'p1' } });
    expect(result.cost_price).toBe(1500);
    expect(result.min_sale_price).toBe(2000);
  });
});
