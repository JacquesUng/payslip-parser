import { Payslip } from '../entities/payslip.entity';

export interface PayslipResponseDto {
  id: string;
  month: number;
  year: number;
  company: string;
  orderIndex: number;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
}

export function toPayslipResponseDto(payslip: Payslip): PayslipResponseDto {
  const { id, month, year, company, orderIndex, originalFileName, mimeType, fileSize, createdAt } =
    payslip;
  return { id, month, year, company, orderIndex, originalFileName, mimeType, fileSize, createdAt };
}
