import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsEnum, IsOptional } from 'class-validator';
import { ItemType } from '../entities/item.entity';

export class FindItemsQueryDto {
  @ApiPropertyOptional({ enum: ItemType, example: ItemType.BOOK })
  @IsOptional()
  @IsEnum(ItemType)
  type?: ItemType;

  @ApiPropertyOptional({
    example: 'true',
    description: 'Filtra por disponibilidad. Usar true o false.',
  })
  @IsOptional()
  @IsBooleanString()
  available?: string;
}
