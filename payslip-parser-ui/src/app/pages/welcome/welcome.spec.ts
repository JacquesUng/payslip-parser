import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { Welcome } from './welcome';

describe('Welcome', () => {
  let component: Welcome;
  let fixture: ComponentFixture<Welcome>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Welcome],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Welcome);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts in login mode and toggles to signup mode', () => {
    expect(component.mode()).toBe('login');

    component.toggleMode();

    expect(component.mode()).toBe('signup');
  });

  it('does not send a request when the login form is invalid', () => {
    component.submitLogin();

    httpMock.expectNone('/payslip-api/auth/login');
  });

  it('logs in successfully and navigates to /payslip', () => {
    component.loginForm.setValue({ email: 'a@b.com', password: 'password1' });

    component.submitLogin();

    const req = httpMock.expectOne('/payslip-api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({ email: 'a@b.com' });

    expect(router.navigate).toHaveBeenCalledWith(['/payslip']);
  });

  it('shows a generic error message when login fails', () => {
    component.loginForm.setValue({ email: 'a@b.com', password: 'wrong' });

    component.submitLogin();

    const req = httpMock.expectOne('/payslip-api/auth/login');
    req.flush({ message: 'Invalid email or password' }, { status: 401, statusText: 'Unauthorized' });

    expect(component.errorMessage()).toBe('Invalid email or password');
  });

  it('shows a client-side error and sends no request when signup passwords do not match', () => {
    component.toggleMode();
    component.signupForm.setValue({
      email: 'a@b.com',
      password: 'password1',
      confirmPassword: 'password2',
    });

    component.submitSignup();

    httpMock.expectNone('/payslip-api/auth/signup');
    expect(component.errorMessage()).toBeTruthy();
  });

  it('signs up successfully and navigates to /payslip', () => {
    component.toggleMode();
    component.signupForm.setValue({
      email: 'a@b.com',
      password: 'password1',
      confirmPassword: 'password1',
    });

    component.submitSignup();

    const req = httpMock.expectOne('/payslip-api/auth/signup');
    expect(req.request.method).toBe('POST');
    req.flush({ email: 'a@b.com' });

    expect(router.navigate).toHaveBeenCalledWith(['/payslip']);
  });
});
