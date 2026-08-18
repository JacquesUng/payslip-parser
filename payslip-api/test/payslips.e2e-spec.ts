import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { Repository } from 'typeorm';
import storageConfig from '../src/config/storage.config';
import { Payslip } from '../src/payslips/entities/payslip.entity';
import { PayslipsModule } from '../src/payslips/payslips.module';

interface PayslipApiBody {
  id: string;
  month: number;
  year: number;
  company: string;
  orderIndex: number;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  userId?: string;
  storedFileName?: string;
}

describe('Payslips (e2e)', () => {
  let tempRoot: string;
  let moduleRef: TestingModule;
  let app: INestApplication;
  let payslipRepository: Repository<Payslip>;

  beforeEach(async () => {
    tempRoot = mkdtempSync(join(tmpdir(), 'payslip-e2e-'));

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [storageConfig] }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          entities: [Payslip],
          synchronize: true,
        }),
        PayslipsModule,
      ],
    })
      .overrideProvider(storageConfig.KEY)
      .useValue({ root: tempRoot, maxFileSizeBytes: 10 * 1024 * 1024 })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    payslipRepository = moduleRef.get(getRepositoryToken(Payslip));
  });

  afterEach(async () => {
    await app.close();
    rmSync(tempRoot, { recursive: true, force: true });
  });

  const uploadPayslip = async (userId = 'user-1'): Promise<PayslipApiBody> => {
    const response = await request(app.getHttpServer())
      .post('/payslips')
      .field('userId', userId)
      .attach('file', Buffer.from('payslip content'), 'payslip.pdf')
      .expect(201);
    return response.body as PayslipApiBody;
  };

  describe('POST /payslips', () => {
    it('creates a payslip from a multipart upload and persists both the row and the file', async () => {
      const created = await uploadPayslip();

      expect(created).toMatchObject({
        month: 1,
        year: 2000,
        company: 'Entreprise inconnue',
        orderIndex: 0,
        originalFileName: 'payslip.pdf',
        mimeType: 'application/pdf',
      });
      expect(created.userId).toBeUndefined();
      expect(created.storedFileName).toBeUndefined();

      const row = await payslipRepository.findOneBy({ id: created.id });
      expect(row).not.toBeNull();
      expect(row?.userId).toBe('user-1');
      expect(existsSync(join(tempRoot, 'files', row!.storedFileName))).toBe(true);
    });

    it('returns 400 when no file is attached', async () => {
      await request(app.getHttpServer()).post('/payslips').field('userId', 'user-1').expect(400);
    });
  });

  describe('GET /payslips/:id', () => {
    it('returns 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .get('/payslips/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('returns the payslip metadata for a known id', async () => {
      const created = await uploadPayslip();

      const response = await request(app.getHttpServer())
        .get(`/payslips/${created.id}`)
        .expect(200);
      const found = response.body as PayslipApiBody;

      expect(found.id).toBe(created.id);
      expect(found.userId).toBeUndefined();
      expect(found.storedFileName).toBeUndefined();
    });
  });

  describe('GET /payslips', () => {
    it('filters by userId, month and year', async () => {
      const a = await uploadPayslip('user-1');
      await uploadPayslip('user-2');

      const response = await request(app.getHttpServer())
        .get('/payslips')
        .query({ userId: 'user-1', month: 1, year: 2000 })
        .expect(200);
      const found = response.body as PayslipApiBody[];

      expect(found).toHaveLength(1);
      expect(found[0].id).toBe(a.id);
    });

    it('returns every payslip when called with no query params at all', async () => {
      await uploadPayslip('user-1');
      await uploadPayslip('user-2');

      const response = await request(app.getHttpServer()).get('/payslips').expect(200);
      const found = response.body as PayslipApiBody[];

      expect(found).toHaveLength(2);
    });
  });

  describe('PATCH /payslips/:id', () => {
    it('updates company and orderIndex', async () => {
      const created = await uploadPayslip();

      const response = await request(app.getHttpServer())
        .patch(`/payslips/${created.id}`)
        .send({ company: 'Acme', orderIndex: 4 })
        .expect(200);
      const updated = response.body as PayslipApiBody;

      expect(updated.company).toBe('Acme');
      expect(updated.orderIndex).toBe(4);
    });

    it('rejects a field outside company/orderIndex', async () => {
      const created = await uploadPayslip();

      await request(app.getHttpServer())
        .patch(`/payslips/${created.id}`)
        .send({ month: 3 })
        .expect(400);
    });

    it('returns 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .patch('/payslips/00000000-0000-0000-0000-000000000000')
        .send({ company: 'Acme' })
        .expect(404);
    });
  });

  describe('DELETE /payslips/:id', () => {
    it('removes the row and the file', async () => {
      const created = await uploadPayslip();
      const row = await payslipRepository.findOneBy({ id: created.id });
      const storedPath = join(tempRoot, 'files', row!.storedFileName);
      expect(existsSync(storedPath)).toBe(true);

      await request(app.getHttpServer()).delete(`/payslips/${created.id}`).expect(204);

      expect(await payslipRepository.findOneBy({ id: created.id })).toBeNull();
      expect(existsSync(storedPath)).toBe(false);
    });

    it('returns 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .delete('/payslips/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('still succeeds when the file was already removed from disk', async () => {
      const created = await uploadPayslip();
      const row = await payslipRepository.findOneBy({ id: created.id });
      rmSync(join(tempRoot, 'files', row!.storedFileName));

      await request(app.getHttpServer()).delete(`/payslips/${created.id}`).expect(204);
      expect(await payslipRepository.findOneBy({ id: created.id })).toBeNull();
    });
  });
});
