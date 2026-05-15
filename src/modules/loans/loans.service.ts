import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, Repository } from 'typeorm';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Item } from '../items/entities/item.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { FindLoansQueryDto } from './dto/find-loans-query.dto';
import { Loan, LoanStatus } from './entities/loan.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loansRepo: Repository<Loan>,

    @InjectRepository(Item)
    private readonly itemsRepo: Repository<Item>,

    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,

    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateLoanDto) {
    const user = await this.usersRepo.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuario ${dto.userId} no encontrado`);
    }

    if (!user.isActive) {
      throw new BadRequestException('El usuario no está activo');
    }

    if (user.role !== UserRole.MEMBER) {
      throw new BadRequestException('Solo usuarios con rol member pueden recibir préstamos');
    }

    const item = await this.itemsRepo.findOne({
      where: { id: dto.itemId, isActive: true },
    });

    if (!item) {
      throw new NotFoundException(`Item ${dto.itemId} no encontrado`);
    }

    const loanedAt = new Date();
    const dueAt = new Date(dto.dueAt);

    this.validateDates(loanedAt, dueAt);

    const blockingLoan = await this.loansRepo.findOne({
      where: {
        item: { id: item.id },
        status: In([LoanStatus.ACTIVE, LoanStatus.OVERDUE]),
      },
      relations: ['item'],
    });

    if (blockingLoan) {
      throw new ConflictException(
        `El item no está disponible. Bloqueado por el préstamo ${blockingLoan.id}`,
      );
    }

    const activeLoans = await this.loansRepo.count({
      where: {
        user: { id: user.id },
        status: In([LoanStatus.ACTIVE, LoanStatus.OVERDUE]),
      },
    });

    const maxActiveLoans = this.config.get<number>('loans.maxActivePerUser', 3);

    if (activeLoans >= maxActiveLoans) {
      throw new ConflictException(
        `El usuario ya tiene ${maxActiveLoans} préstamos activos o vencidos`,
      );
    }

    const loan = this.loansRepo.create({
      user,
      item,
      loanedAt,
      dueAt,
      returnedAt: null,
      status: LoanStatus.ACTIVE,
      fineAmount: '0.00',
    });

    const saved = await this.loansRepo.save(loan);

    return this.findOne(saved.id, {
      id: user.id,
      email: user.email,
      role: UserRole.ADMIN,
    });
  }

  async findAll(query: FindLoansQueryDto, actor: AuthenticatedUser) {
    await this.refreshOverdueLoans();

    const effectiveUserId = actor.role === UserRole.MEMBER ? actor.id : query.userId;

    const loans = await this.loansRepo.find({
      where: {
        ...(effectiveUserId ? { user: { id: effectiveUserId } } : {}),
        ...(query.itemId ? { item: { id: query.itemId } } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      relations: ['user', 'item'],
      order: { createdAt: 'DESC' },
    });

    return loans.map((loan) => this.toWithRelationsDto(loan));
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    await this.refreshOverdueLoans();

    const loan = await this.loansRepo.findOne({
      where: { id },
      relations: ['user', 'item'],
    });

    if (!loan) {
      throw new NotFoundException(`Préstamo ${id} no encontrado`);
    }

    if (actor.role === UserRole.MEMBER && loan.user.id !== actor.id) {
      throw new ForbiddenException('No puede consultar préstamos de otro usuario');
    }

    return this.toWithRelationsDto(loan);
  }

  async returnLoan(id: string) {
    await this.refreshOverdueLoans();

    const loan = await this.loansRepo.findOne({
      where: { id },
      relations: ['user', 'item'],
    });

    if (!loan) {
      throw new NotFoundException(`Préstamo ${id} no encontrado`);
    }

    if (loan.status === LoanStatus.RETURNED || loan.status === LoanStatus.LOST) {
      throw new BadRequestException('No se puede devolver un préstamo en estado returned o lost');
    }

    const returnedAt = new Date();

    loan.returnedAt = returnedAt;
    loan.fineAmount = this.calculateFine(loan.dueAt, returnedAt);
    loan.status = LoanStatus.RETURNED;

    const saved = await this.loansRepo.save(loan);

    return this.toWithRelationsDto(saved);
  }

  async markLost(id: string) {
    await this.refreshOverdueLoans();

    const loan = await this.loansRepo.findOne({
      where: { id },
      relations: ['user', 'item'],
    });

    if (!loan) {
      throw new NotFoundException(`Préstamo ${id} no encontrado`);
    }

    if (loan.status === LoanStatus.RETURNED || loan.status === LoanStatus.LOST) {
      throw new BadRequestException(
        'No se puede marcar como perdido un préstamo en estado returned o lost',
      );
    }

    loan.status = LoanStatus.LOST;
    loan.returnedAt = null;

    const saved = await this.loansRepo.save(loan);

    return this.toWithRelationsDto(saved);
  }

  private validateDates(loanedAt: Date, dueAt: Date): void {
    if (Number.isNaN(dueAt.getTime())) {
      throw new BadRequestException('dueAt debe ser una fecha válida');
    }

    if (dueAt <= loanedAt) {
      throw new BadRequestException('dueAt debe ser posterior a loanedAt');
    }

    const maxLoanDays = this.config.get<number>('loans.maxLoanDays', 30);
    const maxDueAt = new Date(loanedAt.getTime() + maxLoanDays * DAY_MS);

    if (dueAt > maxDueAt) {
      throw new BadRequestException(`La ventana máxima de préstamo es de ${maxLoanDays} días`);
    }
  }

  private calculateFine(dueAt: Date, returnedAt: Date): string {
    if (returnedAt <= dueAt) {
      return '0.00';
    }

    const daysOverdue = Math.ceil((returnedAt.getTime() - dueAt.getTime()) / DAY_MS);

    const dailyFineRate = this.config.get<number>('loans.dailyFineRate', 0.5);

    return (daysOverdue * dailyFineRate).toFixed(2);
  }

  private async refreshOverdueLoans(): Promise<void> {
    await this.loansRepo.update(
      {
        status: LoanStatus.ACTIVE,
        returnedAt: IsNull(),
        dueAt: LessThan(new Date()),
      },
      {
        status: LoanStatus.OVERDUE,
      },
    );
  }

  toBasicDto(loan: Loan) {
    return {
      id: loan.id,
      userId: loan.user?.id,
      itemId: loan.item?.id,
      loanedAt: loan.loanedAt,
      dueAt: loan.dueAt,
      returnedAt: loan.returnedAt,
      status: loan.status,
      fineAmount: loan.fineAmount,
    };
  }

  toWithRelationsDto(loan: Loan) {
    return {
      ...this.toBasicDto(loan),
      user: loan.user
        ? {
            id: loan.user.id,
            email: loan.user.email,
            firstName: loan.user.firstName,
            lastName: loan.user.lastName,
            role: loan.user.role,
            isActive: loan.user.isActive,
          }
        : null,
      item: loan.item
        ? {
            id: loan.item.id,
            code: loan.item.code,
            title: loan.item.title,
            type: loan.item.type,
            isActive: loan.item.isActive,
          }
        : null,
    };
  }
}
