import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const saltRounds = this.config.get<number>('bcrypt.saltRounds', 10);
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = this.usersRepo.create({
      email,
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      role: dto.role ?? UserRole.MEMBER,
      isActive: true,
    });

    return this.usersRepo.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.email && dto.email.toLowerCase().trim() !== user.email) {
      const existing = await this.findByEmail(dto.email);

      if (existing) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }

      user.email = dto.email.toLowerCase().trim();
    }

    if (dto.password) {
      const saltRounds = this.config.get<number>('bcrypt.saltRounds', 10);
      user.passwordHash = await bcrypt.hash(dto.password, saltRounds);
    }

    if (dto.firstName) {
      user.firstName = dto.firstName.trim();
    }

    if (dto.lastName) {
      user.lastName = dto.lastName.trim();
    }

    if (dto.role) {
      user.role = dto.role;
    }

    return this.usersRepo.save(user);
  }

  async deactivate(id: string): Promise<User> {
    const user = await this.findById(id);
    user.isActive = false;
    return this.usersRepo.save(user);
  }

  toBasicDto(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
    };
  }
}
