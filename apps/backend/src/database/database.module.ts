import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Group } from '../entities/group.entity';
import { Notification } from '../entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3',
        database: config.get<string>('DB_PATH', './data/app.sqlite'),
        entities: [User, Group, Notification],
        synchronize: true,
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}