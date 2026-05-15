import { ApiProperty } from '@nestjs/swagger';
import { ItemBasicDto } from './item-basic.dto';

export class ItemWithRelationsDto extends ItemBasicDto {
  @ApiProperty({
    description: 'Loans associated with this item. The exact structure is returned by the service.',
    type: 'array',
    items: { type: 'object' },
  })
  loans!: unknown[];
}
