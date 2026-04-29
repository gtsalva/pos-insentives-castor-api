import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Role } from '../../common/enums/role.enum';

const USER_SELECT = ['user_id', 'email', 'full_name', 'role', 'is_active', 'created_at'];

const mockRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const makeUser = (overrides: Partial<User> = {}): User => ({
  user_id: 'uuid-1',
  email: 'test@castor.gt',
  full_name: 'Test User',
  role: Role.SALESPERSON,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  password_hash: 'hashed',
  ...overrides,
} as User);

describe('UsersService', () => {
  let service: UsersService;

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

  // ── Existing methods ─────────────────────────────────────
  it('findByEmail returns user when found', async () => {
    const user = makeUser();
    mockRepo.findOne.mockResolvedValue(user);
    const result = await service.findByEmail('test@castor.gt');
    expect(result).toEqual(user);
    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { email: 'test@castor.gt' } });
  });

  it('findByEmail returns null when not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    expect(await service.findByEmail('x@y.com')).toBeNull();
  });

  // ── update ───────────────────────────────────────────────
  describe('update', () => {
    it('updates user and returns without password_hash', async () => {
      const existing = makeUser();
      const updated = makeUser({ full_name: 'Nuevo Nombre' });
      mockRepo.findOne
        .mockResolvedValueOnce(existing)           // findById check
        .mockResolvedValueOnce(updated);           // re-fetch after update
      mockRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.update('uuid-1', { full_name: 'Nuevo Nombre' });

      expect(mockRepo.update).toHaveBeenCalledWith('uuid-1', { full_name: 'Nuevo Nombre' });
      expect(mockRepo.findOne).toHaveBeenLastCalledWith({
        where: { user_id: 'uuid-1' },
        select: USER_SELECT,
      });
      expect(result.full_name).toBe('Nuevo Nombre');
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.update('bad-id', { full_name: 'X' }))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when new email is already taken', async () => {
      const existing = makeUser({ email: 'old@castor.gt' });
      const other = makeUser({ user_id: 'uuid-2', email: 'taken@castor.gt' });
      mockRepo.findOne
        .mockResolvedValueOnce(existing)  // findById
        .mockResolvedValueOnce(other);    // findByEmail check for new email
      await expect(service.update('uuid-1', { email: 'taken@castor.gt' }))
        .rejects.toThrow(ConflictException);
    });
  });

  // ── toggleStatus ─────────────────────────────────────────
  describe('toggleStatus', () => {
    it('flips is_active from true to false', async () => {
      const active = makeUser({ is_active: true });
      const inactive = makeUser({ is_active: false });
      mockRepo.findOne
        .mockResolvedValueOnce(active)    // findById
        .mockResolvedValueOnce(inactive); // re-fetch after update
      mockRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.toggleStatus('uuid-1');

      expect(mockRepo.update).toHaveBeenCalledWith('uuid-1', { is_active: false });
      expect(result.is_active).toBe(false);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.toggleStatus('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
