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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
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
@UseGuards(JwtAuthGuard)
export class PayslipsController {
  constructor(private readonly payslipsService: PayslipsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<PayslipResponseDto> {
    if (!file) {
      throw new BadRequestException('A file is required');
    }

    const payslip = await this.payslipsService.create({
      userId: user.id,
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
  async findAll(
    @Query() query: ListPayslipsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PayslipResponseDto[]> {
    // The ValidationPipe instantiates ListPayslipsQueryDto with every field present
    // (explicitly `undefined` when omitted), but TypeORM's `where` rejects explicit
    // undefined values — so only forward the filters that were actually provided.
    const filter: ListPayslipsFilter = { userId: user.id };
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
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PayslipResponseDto> {
    const payslip = await this.payslipsService.findById(id, user.id);
    if (!payslip) {
      throw new NotFoundException(`Payslip ${id} not found`);
    }
    return toPayslipResponseDto(payslip);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePayslipDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PayslipResponseDto> {
    const payslip = await this.payslipsService.update(id, user.id, dto);
    if (!payslip) {
      throw new NotFoundException(`Payslip ${id} not found`);
    }
    return toPayslipResponseDto(payslip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    const deleted = await this.payslipsService.delete(id, user.id);
    if (!deleted) {
      throw new NotFoundException(`Payslip ${id} not found`);
    }
  }
}
