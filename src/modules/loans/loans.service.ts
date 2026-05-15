import { Injectable } from '@nestjs/common';
import { Loan } from './entities/loan.entity';

@Injectable()
export class LoansService {
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
