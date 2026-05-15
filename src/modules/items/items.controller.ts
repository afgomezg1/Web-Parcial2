import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { FindItemsQueryDto } from './dto/find-items-query.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemType } from './entities/item.entity';
import { ItemsService } from './items.service';

@ApiTags('items')
@ApiBearerAuth()
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({ summary: 'Crear item' })
  create(@Body() dto: CreateItemDto) {
    return this.itemsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar items activos. Cada item incluye isAvailable. Filtros opcionales: type y available.',
  })
  @ApiQuery({ name: 'type', enum: ItemType, required: false })
  @ApiQuery({ name: 'available', required: false, example: 'true' })
  findAll(@Query() query: FindItemsQueryDto) {
    return this.itemsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un item, incluyendo isAvailable' })
  @ApiParam({ name: 'id', type: 'string' })
  findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({ summary: 'Actualizar title o type' })
  @ApiParam({ name: 'id', type: 'string' })
  update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({ summary: 'Soft delete de item: isActive = false' })
  @ApiParam({ name: 'id', type: 'string' })
  remove(@Param('id') id: string) {
    return this.itemsService.softDelete(id);
  }
}
