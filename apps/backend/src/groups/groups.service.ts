import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../entities/group.entity';
import { User } from '../entities/user.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { SafeUser } from '../users/users.service';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private readonly groupsRepo: Repository<Group>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [items, total] = await this.groupsRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'ASC' },
    });

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<Group> {
    return this.getGroupOrFail(id);
  }

  async create(dto: CreateGroupDto): Promise<Group> {
    const existing = await this.groupsRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException('Group name already in use');
    }
    const group = this.groupsRepo.create({ name: dto.name });
    return this.groupsRepo.save(group);
  }

  async addMember(groupId: string, userId: string): Promise<SafeUser> {
    const group = await this.getGroupOrFail(groupId);
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: { groups: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const alreadyMember = user.groups.some((g) => g.id === group.id);
    if (!alreadyMember) {
      user.groups.push(group);
      await this.usersRepo.save(user);
    }

    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await this.getGroupOrFail(groupId);
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: { groups: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.groups = user.groups.filter((g) => g.id !== groupId);
    await this.usersRepo.save(user);
  }

  async listMembers(groupId: string, query: PaginationQueryDto) {
    await this.getGroupOrFail(groupId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [members, total] = await this.usersRepo
      .createQueryBuilder('user')
      .innerJoin('user.groups', 'group', 'group.id = :groupId', { groupId })
      .orderBy('user.email', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: members.map(({ passwordHash: _passwordHash, ...safe }) => safe),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private async getGroupOrFail(id: string): Promise<Group> {
    const group = await this.groupsRepo.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }
}