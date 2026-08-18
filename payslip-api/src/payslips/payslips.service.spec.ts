import { PayloadTooLargeException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import storageConfig from '../config/storage.config';
import { Payslip } from './entities/payslip.entity';
import { FileStorageService } from './file-storage.service';
import { PayslipsService } from './payslips.service';
import { CreatePayslipInput } from './payslips.types';

describe('PayslipsService', () => {
  let tempRoot: string;
  let moduleRef: TestingModule;
  let service: PayslipsService;

  const buildInput = (overrides: Partial<CreatePayslipInput> = {}): CreatePayslipInput => ({
    userId: 'user-1',
    month: 6,
    year: 2026,
    company: 'Acme',
    file: {
      buffer: Buffer.from('payslip content'),
      originalFileName: 'payslip.pdf',
      mimeType: 'application/pdf',
    },
    ...overrides,
  });

  beforeEach(async () => {
    tempRoot = mkdtempSync(join(tmpdir(), 'payslip-service-test-'));

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          entities: [Payslip],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Payslip]),
      ],
      providers: [
        PayslipsService,
        FileStorageService,
        {
          provide: storageConfig.KEY,
          useValue: { root: tempRoot, maxFileSizeBytes: 10 * 1024 * 1024 },
        },
      ],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(PayslipsService);
  });

  afterEach(async () => {
    await moduleRef.close();
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('persists a payslip with all fields correctly populated', async () => {
    const created = await service.create(buildInput());

    expect(created.userId).toBe('user-1');
    expect(created.month).toBe(6);
    expect(created.year).toBe(2026);
    expect(created.company).toBe('Acme');
    expect(created.originalFileName).toBe('payslip.pdf');
    expect(created.mimeType).toBe('application/pdf');
    expect(created.fileSize).toBe(Buffer.from('payslip content').length);
    expect(created.storedFileName).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(existsSync(join(tempRoot, 'files', created.storedFileName))).toBe(true);
  });

  it('rejects a file over the max size without writing to disk or the database', async () => {
    const oversized = Buffer.alloc(11 * 1024 * 1024, 1);

    await expect(
      service.create(
        buildInput({
          file: { buffer: oversized, originalFileName: 'big.pdf', mimeType: 'application/pdf' },
        }),
      ),
    ).rejects.toThrow(PayloadTooLargeException);

    expect(readdirSync(join(tempRoot, 'files'))).toHaveLength(0);
    expect(await service.findAll()).toHaveLength(0);
  });

  it('gives orderIndex 0 to the first payslip in a (userId, month, year) group', async () => {
    const created = await service.create(buildInput());
    expect(created.orderIndex).toBe(0);
  });

  it('increments orderIndex for successive collisions and never mutates earlier rows', async () => {
    const first = await service.create(buildInput());
    const second = await service.create(buildInput());
    const third = await service.create(buildInput());

    expect(second.orderIndex).toBe(1);
    expect(third.orderIndex).toBe(2);

    const reloadedFirst = await service.findById(first.id);
    expect(reloadedFirst?.orderIndex).toBe(0);
  });

  it('increments orderIndex on collision even when the company differs', async () => {
    await service.create(buildInput({ company: 'Acme' }));
    const second = await service.create(buildInput({ company: 'Globex' }));

    expect(second.orderIndex).toBe(1);
  });

  it('findById returns null for an unknown id', async () => {
    expect(await service.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('findAll filters by userId, month and year and orders by createdAt', async () => {
    const a = await service.create(buildInput({ userId: 'user-1', month: 1, year: 2026 }));
    await service.create(buildInput({ userId: 'user-2', month: 1, year: 2026 }));
    await service.create(buildInput({ userId: 'user-1', month: 2, year: 2026 }));

    const results = await service.findAll({ userId: 'user-1', month: 1, year: 2026 });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(a.id);
  });

  describe('update', () => {
    it('updates only company when orderIndex is omitted', async () => {
      const created = await service.create(buildInput());

      const updated = await service.update(created.id, { company: 'New Co' });

      expect(updated?.company).toBe('New Co');
      expect(updated?.orderIndex).toBe(created.orderIndex);
    });

    it('updates only orderIndex when company is omitted', async () => {
      const created = await service.create(buildInput());

      const updated = await service.update(created.id, { orderIndex: 7 });

      expect(updated?.orderIndex).toBe(7);
      expect(updated?.company).toBe(created.company);
    });

    it('updates both fields when both are provided', async () => {
      const created = await service.create(buildInput());

      const updated = await service.update(created.id, { company: 'New Co', orderIndex: 3 });

      expect(updated?.company).toBe('New Co');
      expect(updated?.orderIndex).toBe(3);
    });

    it('leaves unrelated fields untouched', async () => {
      const created = await service.create(buildInput());

      const updated = await service.update(created.id, { company: 'New Co' });

      expect(updated?.month).toBe(created.month);
      expect(updated?.year).toBe(created.year);
      expect(updated?.storedFileName).toBe(created.storedFileName);
    });

    it('returns null for an unknown id', async () => {
      const result = await service.update('00000000-0000-0000-0000-000000000000', {
        company: 'New Co',
      });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes the row and the underlying file', async () => {
      const created = await service.create(buildInput());
      const storedPath = join(tempRoot, 'files', created.storedFileName);
      expect(existsSync(storedPath)).toBe(true);

      const result = await service.delete(created.id);

      expect(result).toBe(true);
      expect(await service.findById(created.id)).toBeNull();
      expect(existsSync(storedPath)).toBe(false);
    });

    it('returns false for an unknown id and does not throw', async () => {
      const result = await service.delete('00000000-0000-0000-0000-000000000000');

      expect(result).toBe(false);
    });

    it('still deletes the row when the file is already missing on disk', async () => {
      const created = await service.create(buildInput());
      const storedPath = join(tempRoot, 'files', created.storedFileName);
      rmSync(storedPath);

      const result = await service.delete(created.id);

      expect(result).toBe(true);
      expect(await service.findById(created.id)).toBeNull();
    });
  });
});
