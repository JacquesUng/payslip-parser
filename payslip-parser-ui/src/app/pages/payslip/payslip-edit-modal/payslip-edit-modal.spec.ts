import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Payslip } from '../../../services/payslip-api.service';
import { PayslipEditModal } from './payslip-edit-modal';

function makePayslip(overrides: Partial<Payslip>): Payslip {
  return {
    id: '1',
    month: 1,
    year: 2026,
    company: 'Acme',
    orderIndex: 0,
    originalFileName: 'payslip.pdf',
    mimeType: 'application/pdf',
    fileSize: 123,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('PayslipEditModal', () => {
  let fixture: ComponentFixture<PayslipEditModal>;
  let component: PayslipEditModal;
  let httpMock: HttpTestingController;

  const editedPayslip = makePayslip({ id: '1', company: 'Acme', orderIndex: 0 });
  const other1 = makePayslip({ id: '2', company: 'Beta', orderIndex: 1 });
  const other2 = makePayslip({ id: '3', company: 'Gamma', orderIndex: 2 });

  function createComponent(): void {
    fixture = TestBed.createComponent(PayslipEditModal);
    fixture.componentRef.setInput('payslip', editedPayslip);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayslipEditModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches the month payslips on init and pre-fills the company field', () => {
    createComponent();

    const req = httpMock.expectOne(
      (r) => r.url === '/payslip-api/payslips' && r.params.get('month') === '1' && r.params.get('year') === '2026',
    );
    req.flush([editedPayslip, other1, other2]);

    expect(component.monthPayslips().map((p) => p.id)).toEqual(['1', '2', '3']);
    expect(component.form.value.company).toBe('Acme');
  });

  it('marks the company field invalid when cleared', () => {
    createComponent();
    httpMock.expectOne((r) => r.url === '/payslip-api/payslips').flush([editedPayslip]);

    component.form.controls.company.setValue('');

    expect(component.form.invalid).toBe(true);
  });

  it('moveUp/moveDown reorder the local list and no-op at the boundaries', () => {
    createComponent();
    httpMock.expectOne((r) => r.url === '/payslip-api/payslips').flush([editedPayslip, other1, other2]);

    component.moveUp(0);
    expect(component.monthPayslips().map((p) => p.id)).toEqual(['1', '2', '3']);

    component.moveDown(0);
    expect(component.monthPayslips().map((p) => p.id)).toEqual(['2', '1', '3']);

    component.moveUp(2);
    expect(component.monthPayslips().map((p) => p.id)).toEqual(['2', '3', '1']);

    component.moveDown(2);
    expect(component.monthPayslips().map((p) => p.id)).toEqual(['2', '3', '1']);
  });

  it('sends one PATCH per changed payslip, with only the changed fields', () => {
    createComponent();
    httpMock.expectOne((r) => r.url === '/payslip-api/payslips').flush([editedPayslip, other1, other2]);

    component.form.controls.company.setValue('Acme Corp');
    component.moveDown(0);

    let saved = false;
    component.saved.subscribe(() => (saved = true));
    component.submit();

    const req1 = httpMock.expectOne((r) => r.url === '/payslip-api/payslips/2' && r.method === 'PATCH');
    expect(req1.request.body).toEqual({ orderIndex: 0 });
    req1.flush(other1);

    const req2 = httpMock.expectOne((r) => r.url === '/payslip-api/payslips/1' && r.method === 'PATCH');
    expect(req2.request.body).toEqual({ company: 'Acme Corp', orderIndex: 1 });
    req2.flush(editedPayslip);

    expect(saved).toBe(true);
  });

  it('sends no PATCH requests and closes when nothing changed', () => {
    createComponent();
    httpMock.expectOne((r) => r.url === '/payslip-api/payslips').flush([editedPayslip, other1, other2]);

    let saved = false;
    component.saved.subscribe(() => (saved = true));
    component.submit();

    expect(saved).toBe(true);
  });

  it('surfaces an error and does not emit saved when a PATCH fails', () => {
    createComponent();
    httpMock.expectOne((r) => r.url === '/payslip-api/payslips').flush([editedPayslip, other1, other2]);

    component.form.controls.company.setValue('Acme Corp');

    let saved = false;
    component.saved.subscribe(() => (saved = true));
    component.submit();

    expect(component.submitting()).toBe(true);

    const req = httpMock.expectOne((r) => r.url === '/payslip-api/payslips/1' && r.method === 'PATCH');
    req.flush({ message: 'Boom' }, { status: 400, statusText: 'Bad Request' });

    expect(saved).toBe(false);
    expect(component.submitting()).toBe(false);
    expect(component.errorMessage()).toBe('Boom');
  });
});
