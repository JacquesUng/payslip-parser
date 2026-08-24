import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { unauthorizedInterceptor } from './unauthorized.interceptor';

describe('unauthorizedInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([unauthorizedInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('redirects to /welcome on a 401 from a non-auth endpoint', () => {
    http.get('/payslip-api/payslips').subscribe({ error: () => undefined });

    httpMock
      .expectOne('/payslip-api/payslips')
      .flush({ message: 'Not authenticated' }, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigate).toHaveBeenCalledWith(['/welcome']);
  });

  it('does not redirect on a 401 from /auth/login', () => {
    http.post('/payslip-api/auth/login', {}).subscribe({ error: () => undefined });

    httpMock
      .expectOne('/payslip-api/auth/login')
      .flush({ message: 'Invalid email or password' }, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
