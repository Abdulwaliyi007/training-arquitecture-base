import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Roles(Role.MANAGER, Role.ADMIN)
  @Post()
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(actor, dto);
  }

  @Get()
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.findAll(actor, query);
  }

  @Get(':id')
  findOne(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationsService.findOne(actor, id);
  }

  @Patch(':id/read')
  markAsRead(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationsService.markAsRead(actor, id);
  }

  @Roles(Role.MANAGER, Role.ADMIN)
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.notificationsService.updateStatus(actor, id, dto);
  }
}