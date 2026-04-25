import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();
    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('findByEmail returns user when found', async () => {
    const user = { user_id: '1', email: 'a@b.com', role: 'ADMIN' };
    mockRepo.findOne.mockResolvedValue(user);
    const result = await service.findByEmail('a@b.com');
    expect(result).toEqual(user);
    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
  });

  it('findByEmail returns null when not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    const result = await service.findByEmail('x@y.com');
    expect(result).toBeNull();
  });
});
