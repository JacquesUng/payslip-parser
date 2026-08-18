export interface CreatePayslipInput {
  userId: string;
  month: number;
  year: number;
  company: string;
  file: {
    buffer: Buffer;
    originalFileName: string;
    mimeType: string;
  };
}

export interface ListPayslipsFilter {
  userId?: string;
  month?: number;
  year?: number;
}

export interface UpdatePayslipInput {
  company?: string;
  orderIndex?: number;
}
