import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PayslipApiService } from './payslip-api.service';

describe('PayslipApiService', () => {
  let service: PayslipApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PayslipApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists payslips with only the provided filters as query params', () => {
    service.list({ userId: 'user-1', month: 6 }).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === '/payslip-api/payslips' && r.method === 'GET',
    );
    expect(req.request.params.get('userId')).toBe('user-1');
    expect(req.request.params.get('month')).toBe('6');
    expect(req.request.params.has('year')).toBe(false);
    req.flush([]);
  });

  it('gets a payslip by id', () => {
    service.getById('abc').subscribe();

    const req = httpMock.expectOne('/payslip-api/payslips/abc');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('uploads a file as multipart form data with the userId field', () => {
    const file = new File(['content'], 'payslip.pdf', { type: 'application/pdf' });

    service.upload(file, 'user-1').subscribe();

    const req = httpMock.expectOne('/payslip-api/payslips');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    const body = req.request.body as FormData;
    expect(body.get('userId')).toBe('user-1');
    expect(body.get('file')).toBe(file);
    req.flush({});
  });

  it('sends only the provided fields on update', () => {
    service.update('abc', { company: 'Acme' }).subscribe();

    const req = httpMock.expectOne('/payslip-api/payslips/abc');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ company: 'Acme' });
    req.flush({});
  });

  it('sends a DELETE request for the given id', () => {
    service.delete('abc').subscribe();

    const req = httpMock.expectOne('/payslip-api/payslips/abc');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
