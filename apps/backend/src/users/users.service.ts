import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { Group } from '../entities/group.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Group) private readonly groupsRepo: Repository<Group>,
  ) {}

  private sanitize(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  async findAll(): Promise<SafeUser[]> {
    const users = await this.usersRepo.find({ relations: { groups: true } });
    return users.map((u) => this.sanitize(u));
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.getUserOrFail(id);
    return this.sanitize(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { email },
      relations: { groups: true },
    });
  }

  async create(dto: CreateUserDto): Promise<SafeUser> {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const groups = await this.resolveGroups(dto.groupIds);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
      groups,
    });

    const saved = await this.usersRepo.save(user);
    return this.sanitize(saved);
  }

  async update(id: string, dto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.getUserOrFail(id);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
      user.email = dto.email;
    }

    if (dto.role) {
      user.role = dto.role;
    }

    if (dto.groupIds) {
      user.groups = await this.resolveGroups(dto.groupIds);
    }

    const saved = await this.usersRepo.save(user);
    return this.sanitize(saved);
  }

  async remove(id: string): Promise<void> {
    const user = await this.getUserOrFail(id);
    await this.usersRepo.remove(user);
  }

  private async getUserOrFail(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations: { groups: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async resolveGroups(groupIds?: string[]): Promise<Group[]> {
    if (!groupIds || groupIds.length === 0) return [];
    const groups = await this.groupsRepo.find({ where: { id: In(groupIds) } });
    if (groups.length !== groupIds.length) {
      throw new NotFoundException('One or more groups do not exist');
    }
    return groups;
  }
}