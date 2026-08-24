import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { ProtectedLayout } from './protected-layout';

describe('ProtectedLayout', () => {
  let component: ProtectedLayout;
  let fixture: ComponentFixture<ProtectedLayout>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProtectedLayout],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProtectedLayout);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('displays the connected user email', () => {
    fixture.detectChanges();
    httpMock.expectOne('/payslip-api/auth/me').flush({ email: 'a@b.com' });

    expect(component.email()).toBe('a@b.com');
  });

  it('logs out and navigates to /welcome', () => {
    fixture.detectChanges();
    httpMock.expectOne('/payslip-api/auth/me').flush({ email: 'a@b.com' });

    component.logout();

    httpMock.expectOne('/payslip-api/auth/logout').flush({ success: true });

    expect(router.navigate).toHaveBeenCalledWith(['/welcome']);
  });
});
