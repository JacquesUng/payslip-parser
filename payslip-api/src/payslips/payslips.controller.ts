import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreatePayslipDto } from './dto/create-payslip.dto';
import { ListPayslipsQueryDto } from './dto/list-payslips-query.dto';
import { PayslipResponseDto, toPayslipResponseDto } from './dto/payslip-response.dto';
import { UpdatePayslipDto } from './dto/update-payslip.dto';
import { PayslipsService } from './payslips.service';
import { ListPayslipsFilter } from './payslips.types';

// Placeholder metadata used until a future issue adds real parsing-from-file.
const UPLOAD_PLACEHOLDERS = {
  company: 'Entreprise inconnue',
  month: 1,
  year: 2000,
};

@Controller('payslips')
export class PayslipsController {
  constructor(private readonly payslipsService: PayslipsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() dto: CreatePayslipDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<PayslipResponseDto> {
    if (!file) {
      throw new BadRequestException('A file is required');
    }

    const payslip = await this.payslipsService.create({
      userId: dto.userId,
      company: UPLOAD_PLACEHOLDERS.company,
      month: UPLOAD_PLACEHOLDERS.month,
      year: UPLOAD_PLACEHOLDERS.year,
      file: {
        buffer: file.buffer,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
      },
    });

    return toPayslipResponseDto(payslip);
  }

  @Get()
  async findAll(@Query() query: ListPayslipsQueryDto): Promise<PayslipResponseDto[]> {
    // The ValidationPipe instantiates ListPayslipsQueryDto with every field present
    // (explicitly `undefined` when omitted), but TypeORM's `where` rejects explicit
    // undefined values — so only forward the filters that were actually provided.
    const filter: ListPayslipsFilter = {};
    if (query.userId !== undefined) {
      filter.userId = query.userId;
    }
    if (query.month !== undefined) {
      filter.month = query.month;
    }
    if (query.year !== undefined) {
      filter.year = query.year;
    }

    const payslips = await this.payslipsService.findAll(filter);
    return payslips.map(toPayslipResponseDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PayslipResponseDto> {
    const payslip = await this.payslipsService.findById(id);
    if (!payslip) {
      throw new NotFoundException(`Payslip ${id} not found`);
    }
    return toPayslipResponseDto(payslip);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePayslipDto,
  ): Promise<PayslipResponseDto> {
    const payslip = await this.payslipsService.update(id, dto);
    if (!payslip) {
      throw new NotFoundException(`Payslip ${id} not found`);
    }
    return toPayslipResponseDto(payslip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    const deleted = await this.payslipsService.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Payslip ${id} not found`);
    }
  }
}
