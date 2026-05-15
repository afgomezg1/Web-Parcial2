import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsModule } from '../items/items.module';
import { UsersModule } from '../users/users.module';
import { Loan } from './entities/loan.entity';
import { LoansService } from './loans.service';

@Module({
  imports: [TypeOrmModule.forFeature([Loan]), UsersModule, ItemsModule],
  providers: [LoansService],
  exports: [TypeOrmModule, LoansService],
})
export class LoansModule {}
