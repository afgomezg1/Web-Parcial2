import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateLoanDto {
  @ApiProperty({ example: 'uuid-del-member' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: 'uuid-del-item' })
  @IsUUID()
  @IsNotEmpty()
  itemId!: string;

  @ApiProperty({ example: '2026-05-22T10:00:00.000Z' })
  @IsDateString()
  dueAt!: string;
}
