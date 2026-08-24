import { ExecutionContext, INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import authConfig from '../config/auth.config';
import storageConfig from '../config/storage.config';
import { JwtAuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-user';
import { User } from '../users/entities/user.entity';
import { Payslip } from './entities/payslip.entity';
import { PayslipsModule } from './payslips.module';

describe('PayslipsController (ownership scoping)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let tempRoot: string;
  let currentUserId: string;

  const setCurrentUser = (userId: string) => {
    currentUserId = userId;
  };

  beforeEach(async () => {
    tempRoot = mkdtempSync(join(tmpdir(), 'payslips-controller-test-'));
    currentUserId = 'user-1';

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [storageConfig, authConfig] }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          entities: [Payslip, User],
          synchronize: true,
        }),
        PayslipsModule,
      ],
    })
      .overrideProvider(storageConfig.KEY)
      .useValue({ root: tempRoot, maxFileSizeBytes: 10 * 1024 * 1024 })
      .overrideProvider(authConfig.KEY)
      .useValue({ jwtSecret: 'test-secret', cookieName: 'x', cookieMaxAgeMs: 1000 })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
          req.user = { id: currentUserId, email: `${currentUserId}@example.com` };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    rmSync(tempRoot, { recursive: true, force: true });
  });

  async function uploadAsCurrentUser(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/payslips')
      .attach('file', Buffer.from('payslip content'), 'payslip.pdf')
      .expect(201);
    return (response.body as { id: string }).id;
  }

  it('a payslip created by user-1 is invisible to user-2', async () => {
    setCurrentUser('user-1');
    const id = await uploadAsCurrentUser();

    setCurrentUser('user-2');
    await request(app.getHttpServer()).get(`/payslips/${id}`).expect(404);

    setCurrentUser('user-1');
    await request(app.getHttpServer()).get(`/payslips/${id}`).expect(200);
  });

  it("listing only returns the current user's payslips", async () => {
    setCurrentUser('user-1');
    await uploadAsCurrentUser();

    setCurrentUser('user-2');
    await uploadAsCurrentUser();

    const response = await request(app.getHttpServer()).get('/payslips').expect(200);
    expect((response.body as unknown[]).length).toBe(1);
  });

  it('another user cannot update a payslip they do not own', async () => {
    setCurrentUser('user-1');
    const id = await uploadAsCurrentUser();

    setCurrentUser('user-2');
    await request(app.getHttpServer())
      .patch(`/payslips/${id}`)
      .send({ company: 'Hijacked' })
      .expect(404);
  });

  it('another user cannot delete a payslip they do not own', async () => {
    setCurrentUser('user-1');
    const id = await uploadAsCurrentUser();

    setCurrentUser('user-2');
    await request(app.getHttpServer()).delete(`/payslips/${id}`).expect(404);

    setCurrentUser('user-1');
    await request(app.getHttpServer()).get(`/payslips/${id}`).expect(200);
  });

  it('rejects requests with no authenticated user', async () => {
    await moduleRef.close();

    const unauthenticatedModuleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [storageConfig, authConfig] }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          entities: [Payslip, User],
          synchronize: true,
        }),
        PayslipsModule,
      ],
    })
      .overrideProvider(storageConfig.KEY)
      .useValue({ root: tempRoot, maxFileSizeBytes: 10 * 1024 * 1024 })
      .overrideProvider(authConfig.KEY)
      .useValue({ jwtSecret: 'test-secret', cookieName: 'x', cookieMaxAgeMs: 1000 })
      .compile();

    const unauthenticatedApp = unauthenticatedModuleRef.createNestApplication();
    await unauthenticatedApp.init();

    await request(unauthenticatedApp.getHttpServer()).get('/payslips').expect(401);

    await unauthenticatedApp.close();
  });
});
