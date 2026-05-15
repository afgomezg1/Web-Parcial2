/// <reference types="jest" />
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { LoansService } from './loans.service';
import { Loan, LoanStatus } from './entities/loan.entity';
import { Item, ItemType } from '../items/entities/item.entity';
import { User, UserRole } from '../users/entities/user.entity';

type MockRepo<T extends object = object> = {
  [P in keyof Repository<T>]?: jest.Mock;
};

describe('LoansService', () => {
  let service: LoansService;
  let loansRepo: MockRepo<Loan>;
  let itemsRepo: MockRepo<Item>;
  let usersRepo: MockRepo<User>;
  let config: Partial<ConfigService>;

  const member: User = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'member@test.com',
    passwordHash: 'hash',
    firstName: 'Member',
    lastName: 'User',
    role: UserRole.MEMBER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const item: Item = {
    id: '22222222-2222-2222-2222-222222222222',
    code: 'BK-0042',
    title: 'Clean Code',
    type: ItemType.BOOK,
    isActive: true,
    loans: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    loansRepo = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
    };

    itemsRepo = {
      findOne: jest.fn(),
    };

    usersRepo = {
      findOne: jest.fn(),
    };

    config = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const values: Record<string, unknown> = {
          'loans.maxActivePerUser': 3,
          'loans.dailyFineRate': 0.5,
          'loans.maxLoanDays': 30,
        };

        return values[key] ?? defaultValue;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        LoansService,
        {
          provide: getRepositoryToken(Loan),
          useValue: loansRepo,
        },
        {
          provide: getRepositoryToken(Item),
          useValue: itemsRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepo,
        },
        {
          provide: ConfigService,
          useValue: config,
        },
      ],
    }).compile();

    service = moduleRef.get(LoansService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('crea préstamo exitoso cuando item está disponible, usuario bajo el límite y fechas válidas', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T10:00:00.000Z'));

    const dueAt = '2026-01-10T10:00:00.000Z';

    const savedLoan: Loan = {
      id: '33333333-3333-3333-3333-333333333333',
      user: member,
      item,
      loanedAt: new Date('2026-01-01T10:00:00.000Z'),
      dueAt: new Date(dueAt),
      returnedAt: null,
      status: LoanStatus.ACTIVE,
      fineAmount: '0.00',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    usersRepo.findOne!.mockResolvedValue(member);
    itemsRepo.findOne!.mockResolvedValue(item);
    loansRepo.findOne!.mockResolvedValueOnce(null).mockResolvedValueOnce(savedLoan);
    loansRepo.count!.mockResolvedValue(0);
    loansRepo.create!.mockReturnValue(savedLoan);
    loansRepo.save!.mockResolvedValue(savedLoan);
    loansRepo.update!.mockResolvedValue({ affected: 0 });

    const result = await service.create({
      userId: member.id,
      itemId: item.id,
      dueAt,
    });

    expect(result).toMatchObject({
      id: savedLoan.id,
      userId: member.id,
      itemId: item.id,
      status: LoanStatus.ACTIVE,
      fineAmount: '0.00',
    });

    expect(loansRepo.save).toHaveBeenCalled();
  });

  it('lanza ConflictException si el item ya tiene préstamo activo u overdue', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T10:00:00.000Z'));

    const blockingLoan = {
      id: '44444444-4444-4444-4444-444444444444',
      status: LoanStatus.ACTIVE,
      item,
      user: member,
    };

    usersRepo.findOne!.mockResolvedValue(member);
    itemsRepo.findOne!.mockResolvedValue(item);
    loansRepo.findOne!.mockResolvedValue(blockingLoan);

    await expect(
      service.create({
        userId: member.id,
        itemId: item.id,
        dueAt: '2026-01-10T10:00:00.000Z',
      }),
    ).rejects.toThrow(ConflictException);

    await expect(
      service.create({
        userId: member.id,
        itemId: item.id,
        dueAt: '2026-01-10T10:00:00.000Z',
      }),
    ).rejects.toThrow(blockingLoan.id);
  });

  it('lanza ConflictException si el usuario ya tiene 3 préstamos activos u overdue', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T10:00:00.000Z'));

    usersRepo.findOne!.mockResolvedValue(member);
    itemsRepo.findOne!.mockResolvedValue(item);
    loansRepo.findOne!.mockResolvedValue(null);
    loansRepo.count!.mockResolvedValue(3);

    await expect(
      service.create({
        userId: member.id,
        itemId: item.id,
        dueAt: '2026-01-10T10:00:00.000Z',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('lanza BadRequestException si dueAt no es posterior a loanedAt', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T10:00:00.000Z'));

    usersRepo.findOne!.mockResolvedValue(member);
    itemsRepo.findOne!.mockResolvedValue(item);

    await expect(
      service.create({
        userId: member.id,
        itemId: item.id,
        dueAt: '2026-01-01T09:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('return calcula multa correctamente: 5 días tarde con DAILY_FINE_RATE 0.50 da 2.50', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T10:00:00.000Z'));

    const loan: Loan = {
      id: '55555555-5555-5555-5555-555555555555',
      user: member,
      item,
      loanedAt: new Date('2026-01-01T10:00:00.000Z'),
      dueAt: new Date('2026-01-10T10:00:00.000Z'),
      returnedAt: null,
      status: LoanStatus.OVERDUE,
      fineAmount: '0.00',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    loansRepo.update!.mockResolvedValue({ affected: 1 });
    loansRepo.findOne!.mockResolvedValue(loan);
    loansRepo.save!.mockImplementation(async (savedLoan: Loan) => savedLoan);

    const result = await service.returnLoan(loan.id);

    expect(result.status).toBe(LoanStatus.RETURNED);
    expect(result.fineAmount).toBe('2.50');
    expect(loansRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: LoanStatus.RETURNED,
        fineAmount: '2.50',
      }),
    );
  });
});
