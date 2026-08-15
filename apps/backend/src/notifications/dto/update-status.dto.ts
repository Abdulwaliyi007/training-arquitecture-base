import { IsEnum } from 'class-validator';
import { NotificationStatus } from '../../common/enums/notification-status.enum';

export class UpdateStatusDto {
  @IsEnum(NotificationStatus)
  status: NotificationStatus;
}