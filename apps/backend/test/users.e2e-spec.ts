import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { seedTestData, TEST_PASSWORD, TestSeedData } from './utils/seed-test-data';

describe('Users (e2e)', () => {
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

  describe('GET /users', () => {
    it('returns 401 with no token', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('returns 403 for a non-admin role', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('returns the user list for an admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4); // admin, manager, user, outsider
      expect(res.body[0].passwordHash).toBeUndefined();
    });
  });

  describe('POST /users', () => {
    it('creates a user as admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'new-user@test.com',
          password: TEST_PASSWORD,
          role: 'USER',
        })
        .expect(201);

      expect(res.body.email).toBe('new-user@test.com');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('rejects a duplicate email with 409', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: seed.users.admin.email, // already exists
          password: TEST_PASSWORD,
          role: 'USER',
        })
        .expect(409);
    });

    it('rejects an invalid email with 400', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'not-an-email',
          password: TEST_PASSWORD,
          role: 'USER',
        })
        .expect(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('deletes a user as admin', async () => {
      const created = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'to-delete@test.com',
          password: TEST_PASSWORD,
          role: 'USER',
        });

      await request(app.getHttpServer())
        .delete(`/users/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/users/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});