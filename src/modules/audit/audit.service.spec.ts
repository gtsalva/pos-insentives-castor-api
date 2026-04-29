import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;
  const mockRepo = { create: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('creates and saves an audit entry without throwing', () => {
    const entry = {} as AuditLog;
    mockRepo.create.mockReturnValue(entry);
    mockRepo.save.mockResolvedValue(entry);

    expect(() =>
      service.log({ action: 'LOGIN', actor: { id: 'u1', name: 'Test' } }),
    ).not.toThrow();

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN', performed_by_id: 'u1', performed_by_name: 'Test' }),
    );
  });
});
