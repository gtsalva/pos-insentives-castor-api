import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: mockRepo },
      ],
    }).compile();
    service = module.get(CategoriesService);
  });

  it('findAll returns array of categories', async () => {
    mockRepo.find.mockResolvedValue([{ category_id: '1', name: 'Salas' }]);
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Salas');
  });
});
