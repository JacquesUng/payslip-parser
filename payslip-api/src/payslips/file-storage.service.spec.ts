import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileStorageService } from './file-storage.service';

describe('FileStorageService', () => {
  let tempRoot: string;
  let service: FileStorageService;

  beforeEach(async () => {
    tempRoot = mkdtempSync(join(tmpdir(), 'payslip-test-'));
    service = new FileStorageService({ root: tempRoot, maxFileSizeBytes: 10 * 1024 * 1024 });
    await service.onModuleInit();
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('writes a file under <root>/files/<uuid>.<ext>', async () => {
    const storedFileName = service.buildStoredFileName('bulletin-juin.pdf');
    expect(storedFileName).toMatch(/^[0-9a-f-]{36}\.pdf$/);

    await service.write(storedFileName, Buffer.from('hello'));

    expect(existsSync(join(tempRoot, 'files', storedFileName))).toBe(true);
  });

  it('never lets the original filename influence the resolved path', () => {
    const storedFileName = service.buildStoredFileName('../../etc/passwd');
    expect(storedFileName).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects a stored filename that attempts to escape the storage directory', async () => {
    await expect(service.write('../evil.txt', Buffer.from('x'))).rejects.toThrow(
      /outside the storage directory/,
    );
  });

  it('round-trips identical bytes through write then read', async () => {
    const storedFileName = service.buildStoredFileName('payslip.png');
    const original = Buffer.from('binary-ish content', 'utf8');

    await service.write(storedFileName, original);
    const readBack = await service.read(storedFileName);

    expect(readBack).toEqual(original);
  });
});
