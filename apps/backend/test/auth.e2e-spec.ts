import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { seedTestData, TEST_PASSWORD, TestSeedData } from './utils/seed-test-data';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let seed: TestSeedData;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('succeeds with valid credentials and returns a JWT + user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seed.users.admin.email, password: TEST_PASSWORD })
        .expect(201); // Nest's default POST success code is 201, not 200

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user.email).toBe(seed.users.admin.email);
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('fails with a wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seed.users.admin.email, password: 'WrongPassword1!' })
        .expect(401);
    });

    it('fails with a non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@test.com', password: TEST_PASSWORD })
        .expect(401);
    });
  });

  describe('GET /me', () => {
    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).get('/me').expect(401);
    });

    it('returns the logged-in user profile with a valid token', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seed.users.user.email, password: TEST_PASSWORD });

      const res = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(seed.users.user.email);
      expect(res.body.passwordHash).toBeUndefined();
    });
  });
});