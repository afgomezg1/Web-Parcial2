import { ApiProperty } from '@nestjs/swagger';
import { LoanBasicDto } from './loan-basic.dto';

export class LoanWithRelationsDto extends LoanBasicDto {
  @ApiProperty({ type: 'object' })
  user!: unknown;

  @ApiProperty({ type: 'object' })
  item!: unknown;
}
