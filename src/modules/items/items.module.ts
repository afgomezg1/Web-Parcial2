import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Item } from './entities/item.entity';
import { ItemsService } from './items.service';

@Module({
  imports: [TypeOrmModule.forFeature([Item])],
  providers: [ItemsService],
  exports: [TypeOrmModule, ItemsService],
})
export class ItemsModule {}
