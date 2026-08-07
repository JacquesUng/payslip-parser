import { registerAs } from '@nestjs/config';
import { resolve } from 'node:path';

export default registerAs('storage', () => ({
  root: process.env['STORAGE_ROOT'] ?? resolve(process.cwd(), 'storage'),
  maxFileSizeBytes: Number(process.env['MAX_FILE_SIZE_BYTES'] ?? 10 * 1024 * 1024),
}));
