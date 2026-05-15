import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateItemDto } from './dto/create-item.dto';
import { FindItemsQueryDto } from './dto/find-items-query.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Item } from './entities/item.entity';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemsRepo: Repository<Item>,

    @InjectRepository(Loan)
    private readonly loansRepo: Repository<Loan>,
  ) {}

  async create(dto: CreateItemDto) {
    const code = dto.code.trim().toUpperCase();

    const existing = await this.itemsRepo.findOne({ where: { code } });

    if (existing) {
      throw new ConflictException('Ya existe un item con ese code');
    }

    const item = this.itemsRepo.create({
      code,
      title: dto.title.trim(),
      type: dto.type,
      isActive: true,
    });

    const saved = await this.itemsRepo.save(item);
    return this.toBasicDto(saved, true);
  }

  async findAll(query: FindItemsQueryDto) {
    const items = await this.itemsRepo.find({
      where: {
        isActive: true,
        ...(query.type ? { type: query.type } : {}),
      },
      order: { createdAt: 'DESC' },
    });

    const result = await Promise.all(
      items.map(async (item) => {
        const isAvailable = await this.isAvailable(item.id);
        return this.toBasicDto(item, isAvailable);
      }),
    );

    if (query.available === undefined) {
      return result;
    }

    const expectedAvailability = query.available === 'true';
    return result.filter((item) => item.isAvailable === expectedAvailability);
  }

  async findOne(id: string) {
    const item = await this.itemsRepo.findOne({
      where: { id, isActive: true },
      relations: ['loans'],
    });

    if (!item) {
      throw new NotFoundException(`Item ${id} no encontrado`);
    }

    const isAvailable = await this.isAvailable(item.id);

    return {
      ...this.toBasicDto(item, isAvailable),
      loans: item.loans ?? [],
    };
  }

  async update(id: string, dto: UpdateItemDto) {
    const item = await this.itemsRepo.findOne({
      where: { id, isActive: true },
    });

    if (!item) {
      throw new NotFoundException(`Item ${id} no encontrado`);
    }

    if (dto.title !== undefined) {
      item.title = dto.title.trim();
    }

    if (dto.type !== undefined) {
      item.type = dto.type;
    }

    const saved = await this.itemsRepo.save(item);
    const isAvailable = await this.isAvailable(saved.id);

    return this.toBasicDto(saved, isAvailable);
  }

  async softDelete(id: string) {
    const item = await this.itemsRepo.findOne({
      where: { id, isActive: true },
    });

    if (!item) {
      throw new NotFoundException(`Item ${id} no encontrado`);
    }

    const activeLoans = await this.loansRepo.count({
      where: {
        item: { id },
        status: In([LoanStatus.ACTIVE, LoanStatus.OVERDUE]),
      },
    });

    if (activeLoans > 0) {
      throw new ConflictException('No se puede eliminar un item con préstamo activo');
    }

    item.isActive = false;
    const saved = await this.itemsRepo.save(item);

    return this.toBasicDto(saved, false);
  }

  async isAvailable(itemId: string): Promise<boolean> {
    const unavailableLoans = await this.loansRepo.count({
      where: {
        item: { id: itemId },
        status: In([LoanStatus.ACTIVE, LoanStatus.OVERDUE, LoanStatus.LOST]),
      },
    });

    return unavailableLoans === 0;
  }

  toBasicDto(item: Item, isAvailable: boolean) {
    return {
      id: item.id,
      code: item.code,
      title: item.title,
      type: item.type,
      isActive: item.isActive,
      isAvailable,
    };
  }
}
