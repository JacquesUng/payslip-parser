import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payslip } from './entities/payslip.entity';
import { FileStorageService } from './file-storage.service';
import { PayslipsService } from './payslips.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payslip])],
  providers: [FileStorageService, PayslipsService],
  exports: [PayslipsService],
})
export class PayslipsModule {}
