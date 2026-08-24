import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('signup posts email and password', () => {
    service.signup('a@b.com', 'password1').subscribe();

    const req = httpMock.expectOne('/payslip-api/auth/signup');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.com', password: 'password1' });
    req.flush({ email: 'a@b.com' });
  });

  it('login posts email and password', () => {
    service.login('a@b.com', 'password1').subscribe();

    const req = httpMock.expectOne('/payslip-api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.com', password: 'password1' });
    req.flush({ email: 'a@b.com' });
  });

  it('logout sends a POST request', () => {
    service.logout().subscribe();

    const req = httpMock.expectOne('/payslip-api/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true });
  });

  it('me sends a GET request', () => {
    service.me().subscribe();

    const req = httpMock.expectOne('/payslip-api/auth/me');
    expect(req.request.method).toBe('GET');
    req.flush({ email: 'a@b.com' });
  });
});
