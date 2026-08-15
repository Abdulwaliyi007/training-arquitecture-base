import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { seedTestData, TEST_PASSWORD, TestSeedData } from './utils/seed-test-data';

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let seed: TestSeedData;
  let adminToken: string;
  let managerToken: string;
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

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: TEST_PASSWORD });
      return res.body.accessToken as string;
    };

    adminToken = await login(seed.users.admin.email);
    managerToken = await login(seed.users.manager.email);
    userToken = await login(seed.users.user.email);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /notifications', () => {
    it('returns 403 when a USER tries to create one', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Hi', body: 'test', groupId: seed.groups.support.id })
        .expect(403);
    });

    it('creates one notification row per group member for a manager targeting their own group', async () => {
      const res = await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Team update',
          body: 'Standup moved',
          groupId: seed.groups.support.id, // manager belongs to "support"
        })
        .expect(201);

      expect(Array.isArray(res.body)).toBe(true);
      // support group has: manager + user (from seed)
      expect(res.body.length).toBe(2);
      expect(res.body.every((n: { status: string }) => n.status === 'QUEUED')).toBe(true);
    });

    it('returns 405 when a manager targets a group they do not belong to', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Sneaky',
          body: 'test',
          groupId: seed.groups.platform.id, // manager is NOT in "platform"
        })
        .expect(405);
    });

    it('returns 405 when a manager tries to target an individual user directly', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Direct',
          body: 'test',
          userId: seed.users.user.id,
        })
        .expect(405);
    });

    it('allows an admin to create a direct notification to an individual user', async () => {
      const res = await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Direct from admin',
          body: 'test',
          userId: seed.users.outsider.id,
        })
        .expect(201);

      expect(res.body.length).toBe(1);
      expect(res.body[0].recipientUserId).toBe(seed.users.outsider.id);
    });

    it('returns 400 when both userId and groupId are provided', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Bad',
          body: 'test',
          userId: seed.users.user.id,
          groupId: seed.groups.support.id,
        })
        .expect(400);
    });

    it('returns 400 when neither userId nor groupId is provided', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Bad', body: 'test' })
        .expect(400);
    });
  });

  describe('GET /notifications', () => {
    it('scopes results to only the recipient for a USER', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const allBelongToUser = res.body.data.every(
        (n: { recipientUserId: string }) => n.recipientUserId === seed.users.user.id,
      );
      expect(allBelongToUser).toBe(true);
    });

    it('scopes results to only the manager\'s groups for a MANAGER', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const allInSupportGroup = res.body.data.every(
        (n: { groupId: string | null }) => n.groupId === seed.groups.support.id,
      );
      expect(allInSupportGroup).toBe(true);
    });

    it('returns everything for an ADMIN, unfiltered by scope', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Admin should see notifications belonging to multiple different groups/users,
      // proving there's no scope restriction applied.
      expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
    });
  });

  describe('GET /notifications/:id', () => {
    let supportNotificationId: string;
    let outsiderNotificationId: string;

    beforeAll(async () => {
      const list = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      const supportNotification = list.body.data.find(
        (n: { groupId: string | null }) => n.groupId === seed.groups.support.id,
      );
      supportNotificationId = supportNotification.id;

      const outsiderNotification = list.body.data.find(
        (n: { recipientUserId: string }) => n.recipientUserId === seed.users.outsider.id,
      );
      outsiderNotificationId = outsiderNotification.id;
    });

    it('returns 404 for a non-existent id', async () => {
      await request(app.getHttpServer())
        .get('/notifications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('returns 405 when a USER requests a notification that is not theirs', async () => {
      await request(app.getHttpServer())
        .get(`/notifications/${outsiderNotificationId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(405);
    });

    it('allows a MANAGER to view a notification within their group', async () => {
      await request(app.getHttpServer())
        .get(`/notifications/${supportNotificationId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('marks the recipient\'s own notification as read', async () => {
      const list = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${userToken}`);
      const notificationId = list.body.data[0].id;

      const res = await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.status).toBe('READ');
    });

    it('returns 405 when trying to mark someone else\'s notification as read', async () => {
      const list = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${adminToken}`);
      const outsiderNotification = list.body.data.find(
        (n: { recipientUserId: string }) => n.recipientUserId === seed.users.outsider.id,
      );

      await request(app.getHttpServer())
        .patch(`/notifications/${outsiderNotification.id}/read`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(405);
    });
  });

  describe('PATCH /notifications/:id/status', () => {
    it('returns 403 when a USER tries to update status', async () => {
      const list = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${userToken}`);
      const notificationId = list.body.data[0].id;

      await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'SENT' })
        .expect(403);
    });

    it('allows a MANAGER to update status within their own group', async () => {
      const list = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${managerToken}`);
      const notificationId = list.body.data[0].id;

      const res = await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'SENT' })
        .expect(200);

      expect(res.body.status).toBe('SENT');
    });

    it('returns 400 for an invalid status value', async () => {
      const list = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${adminToken}`);
      const notificationId = list.body.data[0].id;

      await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'NOT_A_REAL_STATUS' })
        .expect(400);
    });
  });
});