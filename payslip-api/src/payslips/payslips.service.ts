import { BadRequestException, Inject, Injectable, PayloadTooLargeException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import storageConfig from '../config/storage.config';
import { Payslip } from './entities/payslip.entity';
import { FileStorageService } from './file-storage.service';
import { CreatePayslipInput, ListPayslipsFilter } from './payslips.types';

const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

@Injectable()
export class PayslipsService {
  constructor(
    @InjectRepository(Payslip) private readonly payslipRepository: Repository<Payslip>,
    private readonly fileStorage: FileStorageService,
    @Inject(storageConfig.KEY) private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async create(input: CreatePayslipInput): Promise<Payslip> {
    this.validateMonthAndYear(input.month, input.year);

    const { buffer, originalFileName, mimeType } = input.file;
    if (buffer.length > this.config.maxFileSizeBytes) {
      throw new PayloadTooLargeException(
        `File exceeds the maximum allowed size of ${this.config.maxFileSizeBytes} bytes`,
      );
    }

    const storedFileName = this.fileStorage.buildStoredFileName(originalFileName);
    await this.fileStorage.write(storedFileName, buffer);

    const orderIndex = await this.payslipRepository.count({
      where: { userId: input.userId, month: input.month, year: input.year },
    });

    const payslip = this.payslipRepository.create({
      userId: input.userId,
      month: input.month,
      year: input.year,
      company: input.company,
      orderIndex,
      storedFileName,
      originalFileName,
      mimeType,
      fileSize: buffer.length,
    });

    return this.payslipRepository.save(payslip);
  }

  async findById(id: string): Promise<Payslip | null> {
    return this.payslipRepository.findOneBy({ id });
  }

  async findAll(filter: ListPayslipsFilter = {}): Promise<Payslip[]> {
    return this.payslipRepository.find({
      where: filter,
      order: { createdAt: 'ASC' },
    });
  }

  private validateMonthAndYear(month: number, year: number): void {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException(`Invalid month: ${month}`);
    }
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
      throw new BadRequestException(`Invalid year: ${year}`);
    }
  }
}
