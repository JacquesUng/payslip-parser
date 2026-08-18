import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Payslip {
  id: string;
  month: number;
  year: number;
  company: string;
  orderIndex: number;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export interface ListPayslipsParams {
  userId?: string;
  month?: number;
  year?: number;
}

export interface UpdatePayslipPayload {
  company?: string;
  orderIndex?: number;
}

const BASE_URL = '/payslip-api/payslips';

@Injectable({ providedIn: 'root' })
export class PayslipApiService {
  constructor(private readonly http: HttpClient) {}

  list(params: ListPayslipsParams): Observable<Payslip[]> {
    const query: Record<string, string> = {};
    if (params.userId !== undefined) {
      query['userId'] = params.userId;
    }
    if (params.month !== undefined) {
      query['month'] = String(params.month);
    }
    if (params.year !== undefined) {
      query['year'] = String(params.year);
    }
    return this.http.get<Payslip[]>(BASE_URL, { params: query });
  }

  getById(id: string): Observable<Payslip> {
    return this.http.get<Payslip>(`${BASE_URL}/${id}`);
  }

  upload(file: File, userId: string): Observable<Payslip> {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('file', file);
    return this.http.post<Payslip>(BASE_URL, formData);
  }

  update(id: string, payload: UpdatePayslipPayload): Observable<Payslip> {
    return this.http.patch<Payslip>(`${BASE_URL}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
