import { INestApplication } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import authConfig from '../config/auth.config';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const TEST_CONFIG = {
  jwtSecret: 'test-secret',
  cookieName: 'payslip_auth_token',
  cookieMaxAgeMs: 1000,
};

function extractCookie(response: request.Response): string {
  const setCookie: string[] = (response.headers['set-cookie'] as string[] | undefined) ?? [];
  const authCookie = setCookie.find((c) => c.startsWith(`${TEST_CONFIG.cookieName}=`));
  if (!authCookie) {
    throw new Error('Auth cookie not set');
  }
  return authCookie;
}

describe('AuthController', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          entities: [User],
          synchronize: true,
        }),
        UsersModule,
        JwtModule.register({ secret: TEST_CONFIG.jwtSecret }),
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
      ],
      controllers: [AuthController],
      providers: [AuthService, { provide: authConfig.KEY, useValue: TEST_CONFIG }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('signup sets the auth cookie and returns the email', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'a@b.com', password: 'password1' })
      .expect(201);

    expect(response.body).toEqual({ email: 'a@b.com' });
    expect(extractCookie(response)).toContain('HttpOnly');
  });

  it('signup rejects a duplicate email with 409', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'a@b.com', password: 'password1' });

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'a@b.com', password: 'password2' })
      .expect(409);
  });

  it('login succeeds with correct credentials and sets the cookie', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'a@b.com', password: 'password1' });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'password1' })
      .expect(200);

    expect(response.body).toEqual({ email: 'a@b.com' });
    expect(extractCookie(response)).toContain('HttpOnly');
  });

  it('login returns the same generic message for unknown email and wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'a@b.com', password: 'password1' });

    const unknownEmail = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'missing@b.com', password: 'password1' })
      .expect(401);
    const wrongPassword = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'wrong' })
      .expect(401);

    const messageOf = (response: request.Response) =>
      (response.body as { message: string }).message;
    expect(messageOf(wrongPassword)).toBe(messageOf(unknownEmail));
  });

  it('me returns 401 without a cookie', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('me returns the email with a valid cookie from signup', async () => {
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'a@b.com', password: 'password1' });

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', extractCookie(signupResponse))
      .expect(200);

    expect(response.body).toEqual({ email: 'a@b.com' });
  });

  it('logout clears the auth cookie', async () => {
    const response = await request(app.getHttpServer()).post('/auth/logout').expect(200);

    expect(response.body).toEqual({ success: true });
    expect(extractCookie(response)).toMatch(new RegExp(`^${TEST_CONFIG.cookieName}=;`));
  });

  it('throttles login after 5 attempts within the window', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'missing@b.com', password: 'wrong' });
    }

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'missing@b.com', password: 'wrong' })
      .expect(429);
  });
});
