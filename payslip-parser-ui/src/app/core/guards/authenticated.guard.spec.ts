import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { Observable } from 'rxjs';

import { authenticatedGuard } from './authenticated.guard';

describe('authenticatedGuard', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function runGuard(): Observable<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() => authenticatedGuard({} as never, {} as never)) as Observable<
      boolean | UrlTree
    >;
  }

  it('allows access when /auth/me succeeds', () => {
    let result: boolean | UrlTree | undefined;
    runGuard().subscribe((value) => (result = value));

    httpMock.expectOne('/payslip-api/auth/me').flush({ email: 'a@b.com' });

    expect(result).toBe(true);
  });

  it('redirects to /welcome when /auth/me fails', () => {
    const router = TestBed.inject(Router);
    let result: boolean | UrlTree | undefined;
    runGuard().subscribe((value) => (result = value));

    httpMock
      .expectOne('/payslip-api/auth/me')
      .flush({ message: 'Not authenticated' }, { status: 401, statusText: 'Unauthorized' });

    expect(result).toEqual(router.createUrlTree(['/welcome']));
  });
});
