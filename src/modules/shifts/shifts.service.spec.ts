import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { ShiftClose, ShiftStatus } from './entities/shift-close.entity';
import { Reconciliation } from './entities/reconciliation.entity';
import { Sale } from '../sales/entities/sale.entity';
import { AuditService } from '../audit/audit.service';

describe('ShiftsService', () => {
  let service: ShiftsService;
  let shiftCloseRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    shiftCloseRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        { provide: getRepositoryToken(ShiftClose), useValue: shiftCloseRepo },
        { provide: getRepositoryToken(Reconciliation), useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() } },
        { provide: getRepositoryToken(Sale), useValue: { find: jest.fn().mockResolvedValue([]), createQueryBuilder: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
  });

  it('throws ConflictException if shift already CLOSED today', async () => {
    shiftCloseRepo.findOne.mockResolvedValue({ status: ShiftStatus.CLOSED });

    await expect(
      service.close({}, { id: 'u1', name: 'Test' }, 'SALESPERSON'),
    ).rejects.toThrow(ConflictException);
  });

  it('allows close if previous record is REOPENED', async () => {
    shiftCloseRepo.findOne.mockResolvedValue({ status: ShiftStatus.REOPENED, shift_close_id: 'sc-1', cash_total: 0, card_total: 0, transfer_total: 0 });
    shiftCloseRepo.save.mockResolvedValue({ shift_close_id: 'sc-1', status: ShiftStatus.CLOSED });

    const result = await service.close({}, { id: 'u1', name: 'Test' }, 'SALESPERSON');
    expect(result.status).toBe(ShiftStatus.CLOSED);
  });

  it('admin can close on behalf of another salesperson', async () => {
    shiftCloseRepo.findOne.mockResolvedValue(null);
    shiftCloseRepo.create.mockReturnValue({ status: ShiftStatus.CLOSED });
    shiftCloseRepo.save.mockResolvedValue({ shift_close_id: 'sc-2', status: ShiftStatus.CLOSED, total_sales: 0 });

    const result = await service.close(
      { salesperson_id: 'other-user-id' },
      { id: 'admin-id', name: 'Admin' },
      'ADMIN'
    );
    expect(result.status).toBe(ShiftStatus.CLOSED);
  });
});
