import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { config as loadEnv } from 'dotenv';
import { User } from '../entities/user.entity';
import { Group } from '../entities/group.entity';
import { Role } from '../common/enums/role.enum';

loadEnv();

const SEED_PASSWORD = 'Password123!';

async function seed() {
  const dataSource = new DataSource({
    type: 'better-sqlite3',
    database: process.env.DB_PATH ?? './data/app.sqlite',
    entities: [User, Group],
    synchronize: true,
  });

  await dataSource.initialize();

  const groupRepo = dataSource.getRepository(Group);
  const userRepo = dataSource.getRepository(User);

  const groupNames = ['platform', 'support', 'sales'];
  const groups: Record<string, Group> = {};
  for (const name of groupNames) {
    let group = await groupRepo.findOne({ where: { name } });
    if (!group) {
      group = await groupRepo.save(groupRepo.create({ name }));
      console.log(`Created group: ${name}`);
    }
    groups[name] = group;
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const seedUsers: Array<{ email: string; role: Role; groups: string[] }> = [
    { email: 'admin@example.com', role: Role.ADMIN, groups: ['platform'] },
    { email: 'manager@example.com', role: Role.MANAGER, groups: ['support'] },
    { email: 'user@example.com', role: Role.USER, groups: ['support', 'sales'] },
  ];

  for (const seedUser of seedUsers) {
    const existing = await userRepo.findOne({
      where: { email: seedUser.email },
      relations: { groups: true },
    });
    if (existing) {
      console.log(`User already exists, skipping: ${seedUser.email}`);
      continue;
    }

    const user = userRepo.create({
      email: seedUser.email,
      passwordHash,
      role: seedUser.role,
      groups: seedUser.groups.map((name) => groups[name]),
    });
    await userRepo.save(user);
    console.log(`Created user: ${seedUser.email} (${seedUser.role})`);
  }

  await dataSource.destroy();
  console.log('Seed complete.');
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});