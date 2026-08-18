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
    httpMock.expectOne((r) => r.url === '/payslip-api/payslips').flush([]);
  });
});
