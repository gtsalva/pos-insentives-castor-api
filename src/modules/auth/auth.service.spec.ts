import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Role } from '../../common/enums/role.enum';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  const mockUsersService = { findByEmailWithHash: jest.fn() };
  const mockJwtService = { sign: jest.fn().mockReturnValue('token123') };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('login returns access_token when credentials are valid', async () => {
    const hash = await bcrypt.hash('password123', 10);
    mockUsersService.findByEmailWithHash.mockResolvedValue({
      user_id: '1',
      email: 'admin@castor.gt',
      password_hash: hash,
      full_name: 'Admin',
      role: Role.ADMIN,
      is_active: true,
    });
    const result = await service.login({ email: 'admin@castor.gt', password: 'password123' });
    expect(result.access_token).toBe('token123');
    expect(result.user.email).toBe('admin@castor.gt');
    expect((result.user as Record<string, unknown>).password_hash).toBeUndefined();
  });

  it('login throws UnauthorizedException for wrong password', async () => {
    const hash = await bcrypt.hash('correct', 10);
    mockUsersService.findByEmailWithHash.mockResolvedValue({
      user_id: '1',
      email: 'admin@castor.gt',
      password_hash: hash,
      is_active: true,
    });
    await expect(service.login({ email: 'admin@castor.gt', password: 'wrong' }))
      .rejects.toThrow(UnauthorizedException);
  });

  it('login throws UnauthorizedException when user not found', async () => {
    mockUsersService.findByEmailWithHash.mockResolvedValue(null);
    await expect(service.login({ email: 'no@one.com', password: 'x' }))
      .rejects.toThrow(UnauthorizedException);
  });

  it('login throws UnauthorizedException when user is inactive', async () => {
    const hash = await bcrypt.hash('password123', 10);
    mockUsersService.findByEmailWithHash.mockResolvedValue({
      user_id: '1',
      email: 'inactive@castor.gt',
      password_hash: hash,
      full_name: 'Inactive User',
      role: Role.SALESPERSON,
      is_active: false,
    });
    await expect(service.login({ email: 'inactive@castor.gt', password: 'password123' }))
      .rejects.toThrow(UnauthorizedException);
  });
});
