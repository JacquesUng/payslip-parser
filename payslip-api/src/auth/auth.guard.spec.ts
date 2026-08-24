import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './auth.guard';
import { AuthenticatedRequest } from './types/authenticated-user';

const TEST_CONFIG = {
  jwtSecret: 'test-secret',
  cookieName: 'payslip_auth_token',
  cookieMaxAgeMs: 1000,
};

function buildContext(cookies: Record<string, string>): {
  context: ExecutionContext;
  request: Partial<AuthenticatedRequest>;
} {
  const request: Partial<AuthenticatedRequest> = { cookies };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  let jwtService: JwtService;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jwtService = new JwtService({ secret: TEST_CONFIG.jwtSecret });
    guard = new JwtAuthGuard(jwtService, TEST_CONFIG);
  });

  it('allows a request with a valid cookie and populates req.user', async () => {
    const token = jwtService.sign({ sub: 'user-1', email: 'a@b.com' });
    const { context, request } = buildContext({ [TEST_CONFIG.cookieName]: token });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-1', email: 'a@b.com' });
  });

  it('rejects a request with no cookie', async () => {
    const { context } = buildContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a request with a tampered token', async () => {
    const { context } = buildContext({ [TEST_CONFIG.cookieName]: 'not-a-real-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token signed with a different secret', async () => {
    const otherJwtService = new JwtService({ secret: 'other-secret' });
    const token = otherJwtService.sign({ sub: 'user-1', email: 'a@b.com' });
    const { context } = buildContext({ [TEST_CONFIG.cookieName]: token });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
