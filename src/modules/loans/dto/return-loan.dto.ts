import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ReturnLoanDto {
  @ApiPropertyOptional({
    example: '2026-05-20T10:00:00.000Z',
    description: 'Si no se envía, el backend puede usar la fecha actual.',
  })
  @IsOptional()
  @IsDateString()
  returnedAt?: string;
}
