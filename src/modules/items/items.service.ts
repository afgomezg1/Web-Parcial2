import { Injectable } from '@nestjs/common';
import { Item } from './entities/item.entity';

@Injectable()
export class ItemsService {
  toBasicDto(item: Item) {
    return {
      id: item.id,
      code: item.code,
      title: item.title,
      type: item.type,
      isActive: item.isActive,
    };
  }

  toWithRelationsDto(item: Item) {
    return {
      ...this.toBasicDto(item),
      loans: item.loans ?? [],
    };
  }
}
