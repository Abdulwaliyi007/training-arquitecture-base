import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { NotificationStatus } from '../common/enums/notification-status.enum';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  body: string;

  @Column({ type: 'varchar', default: NotificationStatus.QUEUED })
  status: NotificationStatus;

  // Set when this notification was created via a group broadcast.
  // Plain column, not a relation — we only need the id for filtering/scope checks.
  @Column({ type: 'varchar', nullable: true })
  groupId: string | null;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'recipientUserId' })
  recipient: User;

  @Column()
  recipientUserId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}