import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { OutOfScopeException } from './exceptions/out-of-scope.exception';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { NotificationStatus } from '../common/enums/notification-status.enum';
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  // Returns the set of group IDs the given user belongs to.
  private async getUserGroupIds(userId: string): Promise<string[]> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: { groups: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.groups.map((g) => g.id);
  }
  // Decides whether `actor` is allowed to see/act on `notification`,
  // based on the role rules from TASK2.md.
  private async isInScope(
    actor: AuthenticatedUser,
    notification: Notification,
  ): Promise<boolean> {
    if (actor.role === Role.ADMIN) {
      return true;
    }

    if (actor.role === Role.USER) {
      return notification.recipientUserId === actor.id;
    }
  
    // MANAGER: in scope if the notification belongs to one of their groups.
    const managerGroupIds = await this.getUserGroupIds(actor.id);
    return !!notification.groupId && managerGroupIds.includes(notification.groupId);
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateNotificationDto,
  ): Promise<Notification[]> {
    if (dto.userId && dto.groupId) {
      throw new BadRequestException('Provide either userId or groupId, not both');
    }
    if (!dto.userId && !dto.groupId) {
      throw new BadRequestException('Provide either userId or groupId');
    }

    if (actor.role === Role.MANAGER && dto.userId) {
      // Managers may only target groups, never individuals directly.
      throw new OutOfScopeException('Managers can only target groups, not individual users');
    }

    if (dto.groupId) {
      return this.createForGroup(actor, dto.title, dto.body, dto.groupId);
    }

    return this.createForUser(actor, dto.title, dto.body, dto.userId as string);
  }

  private async createForUser(
    actor: AuthenticatedUser,
    title: string,
    body: string,
    userId: string,
  ): Promise<Notification[]> {
    const recipient = await this.usersRepo.findOne({ where: { id: userId } });
    if (!recipient) {
      throw new NotFoundException('Target user not found');
    }

    // Only ADMIN can reach this point with a userId (managers were blocked above).
    const notification = this.notificationsRepo.create({
      title,
      body,
      recipientUserId: recipient.id,
      createdBy: actor.id,
      groupId: null,
    });
    const saved = await this.notificationsRepo.save(notification);
    return [saved];
  }

  private async createForGroup(
    actor: AuthenticatedUser,
    title: string,
    body: string,
    groupId: string,
  ): Promise<Notification[]> {
    if (actor.role === Role.MANAGER) {
      const managerGroupIds = await this.getUserGroupIds(actor.id);
      if (!managerGroupIds.includes(groupId)) {
        throw new OutOfScopeException('You can only target groups you belong to');
      }
    }

    const members = await this.usersRepo
      .createQueryBuilder('user')
      .innerJoin('user.groups', 'group', 'group.id = :groupId', { groupId })
      .getMany();

    if (members.length === 0) {
      throw new NotFoundException('Group not found or has no members');
    }

    const notifications = members.map((member) =>
      this.notificationsRepo.create({
        title,
        body,
        recipientUserId: member.id,
        createdBy: actor.id,
        groupId,
      }),
    );

    return this.notificationsRepo.save(notifications);
  }
  async findOne(actor: AuthenticatedUser, id: string): Promise<Notification> {
    const notification = await this.notificationsRepo.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const allowed = await this.isInScope(actor, notification);
    if (!allowed) {
      throw new OutOfScopeException();
    }

    return notification;
  }
  async findAll(actor: AuthenticatedUser, query: ListNotificationsQueryDto) {
    const page = query.page ?? 1;
    const size = query.size ?? 20;

    const qb = this.notificationsRepo.createQueryBuilder('notification');

    if (actor.role === Role.USER) {
      qb.andWhere('notification.recipientUserId = :userId', { userId: actor.id });
    } else if (actor.role === Role.MANAGER) {
      const managerGroupIds = await this.getUserGroupIds(actor.id);
      if (managerGroupIds.length === 0) {
        return { data: [], meta: { page, size, total: 0, totalPages: 0 } };
      }
      qb.andWhere('notification.groupId IN (:...groupIds)', { groupIds: managerGroupIds });
    }
    // ADMIN: no extra filter — sees everything.

    if (query.status) {
      qb.andWhere('notification.status = :status', { status: query.status });
    }
    if (query.groupId) {
      qb.andWhere('notification.groupId = :groupId', { groupId: query.groupId });
    }

    const [sortField, sortDirRaw] = (query.sort ?? 'createdAt:desc').split(':');
    const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'status'];
    const field = allowedSortFields.includes(sortField) ? sortField : 'createdAt';
    const direction = sortDirRaw?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy(`notification.${field}`, direction);

    qb.skip((page - 1) * size).take(size);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { page, size, total, totalPages: Math.ceil(total / size) },
    };
  }
  async markAsRead(actor: AuthenticatedUser, id: string): Promise<Notification> {
    const notification = await this.findOne(actor, id); // reuses scope check + 404/405

    if (notification.recipientUserId !== actor.id) {
      // Being "in scope" (e.g. a manager viewing their group's notification)
      // isn't the same as being the recipient — only the recipient can mark read.
      throw new OutOfScopeException('Only the recipient can mark this as read');
    }

    notification.status = NotificationStatus.READ;
    return this.notificationsRepo.save(notification);
  }

  async updateStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateStatusDto,
  ): Promise<Notification> {
    const notification = await this.findOne(actor, id); // reuses scope check + 404/405
    notification.status = dto.status;
    return this.notificationsRepo.save(notification);
  }
}