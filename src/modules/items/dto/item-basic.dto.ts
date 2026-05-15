import { ApiProperty } from '@nestjs/swagger';
import { ItemType } from '../entities/item.entity';

export class ItemBasicDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'BK-0042' })
  code!: string;

  @ApiProperty({ example: 'Introduction to Algorithms' })
  title!: string;

  @ApiProperty({ enum: ItemType })
  type!: ItemType;

  @ApiProperty()
  isActive!: boolean;
}
