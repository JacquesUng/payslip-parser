import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { withCredentialsInterceptor } from './with-credentials.interceptor';

describe('withCredentialsInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([withCredentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sets withCredentials on every outgoing request', () => {
    http.get('/payslip-api/auth/me').subscribe();

    const req = httpMock.expectOne('/payslip-api/auth/me');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });
});
