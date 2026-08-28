import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayslipPage } from './payslip';

describe('PayslipPage', () => {
  let component: PayslipPage;
  let fixture: ComponentFixture<PayslipPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayslipPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PayslipPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create and fetch the payslip list on init', () => {
    expect(component).toBeTruthy();
    const req = httpMock.expectOne((r) => r.url === '/payslip-api/payslips');
    expect(req.request.params.has('userId')).toBe(false);
    req.flush([]);
  });

  it('uploads a file without a userId field', () => {
    httpMock.expectOne((r) => r.url === '/payslip-api/payslips').flush([]);

    component.selectedFile = new File(['content'], 'payslip.pdf', { type: 'application/pdf' });
    component.upload();

    const req = httpMock.expectOne((r) => r.url === '/payslip-api/payslips' && r.method === 'POST');
    const body = req.request.body as FormData;
    expect(body.has('userId')).toBe(false);
    req.flush({});

    httpMock.expectOne((r) => r.url === '/payslip-api/payslips').flush([]);
  });

  const payslip = {
    id: '1',
    month: 1,
    year: 2026,
    company: 'Acme',
    orderIndex: 0,
    originalFileName: 'payslip.pdf',
    mimeType: 'application/pdf',
    fileSize: 123,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('openEdit sets the payslip being edited', () => {
    httpMock.expectOne((r) => r.url === '/payslip-api/payslips').flush([]);

    component.openEdit(payslip);

    expect(component.editingPayslip()).toEqual(payslip);
  });

  it('closeEdit clears the payslip being edited without refetching', () => {
    httpMock.expectOne((r) => r.url === '/payslip-api/payslips').flush([]);

    component.openEdit(payslip);
    component.closeEdit();

    expect(component.editingPayslip()).toBeNull();
  });

  it('onSaved clears the payslip being edited and refreshes the list', () => {
    httpMock.expectOne((r) => r.url === '/payslip-api/payslips').flush([]);

    component.openEdit(payslip);
    component.onSaved();

    expect(component.editingPayslip()).toBeNull();
    httpMock.expectOne((r) => r.url === '/payslip-api/payslips').flush([]);
  });
});
