import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { seedTestData, TEST_PASSWORD, TestSeedData } from './utils/seed-test-data';

describe('Groups (e2e)', () => {
  let app: INestApplication<App>;
  let seed: TestSeedData;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    seed = await seedTestData(app);

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: seed.users.admin.email, password: TEST_PASSWORD });
    adminToken = adminLogin.body.accessToken;

    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: seed.users.user.email, password: TEST_PASSWORD });
    userToken = userLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /groups', () => {
    it('returns 403 for a non-admin', async () => {
      await request(app.getHttpServer())
        .get('/groups')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('returns paginated groups for an admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/groups?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta).toMatchObject({ page: 1, limit: 2 });
    });
  });

  describe('Membership', () => {
    it('adds the outsider to the sales group without removing existing memberships', async () => {
      const salesId = seed.groups.sales.id;
      const outsiderId = seed.users.outsider.id;

      // Confirm the outsider starts in zero groups.
      const before = await request(app.getHttpServer())
        .get(`/users/${outsiderId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(before.body.groups).toHaveLength(0);

      await request(app.getHttpServer())
        .post(`/groups/${salesId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: outsiderId })
        .expect(201);

      const afterFirstAdd = await request(app.getHttpServer())
        .get(`/users/${outsiderId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(afterFirstAdd.body.groups).toHaveLength(1);

      // Add to a second group — the first membership should remain (additive).
      const platformId = seed.groups.platform.id;
      await request(app.getHttpServer())
        .post(`/groups/${platformId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: outsiderId })
        .expect(201);

      const afterSecondAdd = await request(app.getHttpServer())
        .get(`/users/${outsiderId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(afterSecondAdd.body.groups).toHaveLength(2);
    });

    it('removes a user from only the specified group', async () => {
      const salesId = seed.groups.sales.id;
      const userId = seed.users.user.id; // starts in support + sales

      await request(app.getHttpServer())
        .delete(`/groups/${salesId}/members/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const after = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const groupNames = after.body.groups.map((g: { name: string }) => g.name);
      expect(groupNames).toContain('support'); // still there
      expect(groupNames).not.toContain('sales'); // removed
    });

    it('lists members of a group, paginated', async () => {
      const supportId = seed.groups.support.id;

      const res = await request(app.getHttpServer())
        .get(`/groups/${supportId}/members?page=1&limit=10`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.meta).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});