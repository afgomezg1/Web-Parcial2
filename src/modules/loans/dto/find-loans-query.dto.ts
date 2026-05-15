import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { LoanStatus } from '../entities/loan.entity';

export class FindLoansQueryDto {
  @ApiPropertyOptional({ example: 'uuid-del-user' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: 'uuid-del-item' })
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiPropertyOptional({ enum: LoanStatus, example: LoanStatus.ACTIVE })
  @IsOptional()
  @IsEnum(LoanStatus)
  status?: LoanStatus;
}
