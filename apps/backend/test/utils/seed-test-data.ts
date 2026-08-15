import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../src/entities/user.entity';
import { Group } from '../../src/entities/group.entity';
import { Role } from '../../src/common/enums/role.enum';

export const TEST_PASSWORD = 'Password123!';

export interface TestSeedData {
  groups: Record<'platform' | 'support' | 'sales', Group>;
  users: {
    admin: User;
    manager: User; // belongs to "support"
    user: User; // belongs to "support" and "sales"
    outsider: User; // belongs to no groups — for negative scope tests
  };
}

export async function seedTestData(app: INestApplication): Promise<TestSeedData> {
  const groupRepo: Repository<Group> = app.get(getRepositoryToken(Group));
  const userRepo: Repository<User> = app.get(getRepositoryToken(User));

  const groupNames = ['platform', 'support', 'sales'] as const;
  const groups = {} as TestSeedData['groups'];
  for (const name of groupNames) {
    groups[name] = await groupRepo.save(groupRepo.create({ name }));
  }

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const admin = await userRepo.save(
    userRepo.create({
      email: 'admin@test.com',
      passwordHash,
      role: Role.ADMIN,
      groups: [groups.platform],
    }),
  );

  const manager = await userRepo.save(
    userRepo.create({
      email: 'manager@test.com',
      passwordHash,
      role: Role.MANAGER,
      groups: [groups.support],
    }),
  );

  const user = await userRepo.save(
    userRepo.create({
      email: 'user@test.com',
      passwordHash,
      role: Role.USER,
      groups: [groups.support, groups.sales],
    }),
  );

  const outsider = await userRepo.save(
    userRepo.create({
      email: 'outsider@test.com',
      passwordHash,
      role: Role.USER,
      groups: [],
    }),
  );

  return { groups, users: { admin, manager, user, outsider } };
}