import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import storageConfig from '../config/storage.config';

const SAFE_EXTENSION_PATTERN = /^\.[a-zA-Z0-9]{1,10}$/;

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly filesDir: string;

  constructor(
    @Inject(storageConfig.KEY) private readonly config: ConfigType<typeof storageConfig>,
  ) {
    this.filesDir = resolve(this.config.root, 'files');
  }

  async onModuleInit(): Promise<void> {
    await mkdir(this.filesDir, { recursive: true });
  }

  buildStoredFileName(originalFileName: string): string {
    const rawExtension = extname(originalFileName);
    const safeExtension = SAFE_EXTENSION_PATTERN.test(rawExtension) ? rawExtension : '';
    return `${randomUUID()}${safeExtension}`;
  }

  async write(storedFileName: string, buffer: Buffer): Promise<void> {
    await writeFile(this.resolveStoredPath(storedFileName), buffer);
  }

  async read(storedFileName: string): Promise<Buffer> {
    return readFile(this.resolveStoredPath(storedFileName));
  }

  async delete(storedFileName: string): Promise<void> {
    try {
      await unlink(this.resolveStoredPath(storedFileName));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.log(`File already missing, skipping delete: ${storedFileName}`);
        return;
      }
      throw err;
    }
  }

  private resolveStoredPath(storedFileName: string): string {
    const path = resolve(this.filesDir, storedFileName);
    if (!path.startsWith(`${this.filesDir}${sep}`)) {
      throw new Error(`Refusing to access path outside the storage directory: ${storedFileName}`);
    }
    return path;
  }
}
