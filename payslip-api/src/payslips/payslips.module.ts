import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payslip } from './entities/payslip.entity';
import { FileStorageService } from './file-storage.service';
import { PayslipsController } from './payslips.controller';
import { PayslipsService } from './payslips.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payslip])],
  controllers: [PayslipsController],
  providers: [FileStorageService, PayslipsService],
  exports: [PayslipsService],
})
export class PayslipsModule {}
