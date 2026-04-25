import { ConflictException, NotFoundException } from '@nestjs/common';
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

  it('findOne returns category when found', async () => {
    mockRepo.findOne.mockResolvedValue({ category_id: '1', name: 'Salas', is_active: true });
    const result = await service.findOne('1');
    expect(result.name).toBe('Salas');
  });

  it('findOne throws NotFoundException when not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('create saves and returns the category', async () => {
    mockRepo.findOne.mockResolvedValue(null); // no duplicate
    const saved = { category_id: '2', name: 'Comedores', is_active: true };
    mockRepo.create.mockReturnValue(saved);
    mockRepo.save.mockResolvedValue(saved);
    const result = await service.create({ name: 'Comedores' });
    expect(result.name).toBe('Comedores');
  });

  it('create throws ConflictException when name already exists', async () => {
    mockRepo.findOne.mockResolvedValue({ category_id: '1', name: 'Salas' });
    await expect(service.create({ name: 'Salas' })).rejects.toThrow(ConflictException);
  });
});
