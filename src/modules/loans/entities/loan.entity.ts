import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Item } from '../../items/entities/item.entity';

export enum LoanStatus {
  ACTIVE = 'active',
  RETURNED = 'returned',
  OVERDUE = 'overdue',
  LOST = 'lost',
}

@Entity('loans')
@Index('idx_loans_item_status', ['item', 'status'])
@Index('idx_loans_user_status', ['user', 'status'])
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Item, (item) => item.loans, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'item_id' })
  item!: Item;

  @Column({ name: 'loaned_at', type: 'timestamptz' })
  loanedAt!: Date;

  @Column({ name: 'due_at', type: 'timestamptz' })
  dueAt!: Date;

  @Column({ name: 'returned_at', type: 'timestamptz', nullable: true })
  returnedAt!: Date | null;

  @Column({
    type: 'enum',
    enum: LoanStatus,
    default: LoanStatus.ACTIVE,
  })
  status!: LoanStatus;

  @Column({
    name: 'fine_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  fineAmount!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
