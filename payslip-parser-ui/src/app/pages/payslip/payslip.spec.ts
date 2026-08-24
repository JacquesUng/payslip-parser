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
});
