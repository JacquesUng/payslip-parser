import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import authConfig from '../config/auth.config';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

const TEST_CONFIG = {
  jwtSecret: 'test-secret',
  cookieName: 'payslip_auth_token',
  cookieMaxAgeMs: 1000,
};

describe('AuthService', () => {
  let moduleRef: TestingModule;
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          entities: [User],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
        JwtModule.register({ secret: TEST_CONFIG.jwtSecret }),
      ],
      providers: [AuthService, UsersService, { provide: authConfig.KEY, useValue: TEST_CONFIG }],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('signup', () => {
    it('hashes the password rather than storing it in clear text', async () => {
      const { user } = await service.signup({ email: 'a@b.com', password: 'password1' });

      expect(user.passwordHash).not.toBe('password1');
    });

    it('returns a token that can be verified and carries no expiry claim', async () => {
      const { token } = await service.signup({ email: 'a@b.com', password: 'password1' });

      const payload = await jwtService.verifyAsync<{ email: string; exp?: number }>(token, {
        secret: TEST_CONFIG.jwtSecret,
      });
      expect(payload.email).toBe('a@b.com');
      expect(payload.exp).toBeUndefined();
    });

    it('rejects a duplicate email with a 409', async () => {
      await service.signup({ email: 'a@b.com', password: 'password1' });

      await expect(service.signup({ email: 'a@b.com', password: 'password2' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('succeeds with correct credentials', async () => {
      await service.signup({ email: 'a@b.com', password: 'password1' });

      const { user } = await service.login({ email: 'a@b.com', password: 'password1' });

      expect(user.email).toBe('a@b.com');
    });

    it('fails with the same generic message for an unknown email', async () => {
      await expect(
        service.login({ email: 'missing@b.com', password: 'password1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('fails with the same generic message for a wrong password', async () => {
      await service.signup({ email: 'a@b.com', password: 'password1' });

      const unknownEmailError = await service
        .login({ email: 'missing@b.com', password: 'password1' })
        .catch((error: UnauthorizedException) => error.message);
      const wrongPasswordError = await service
        .login({ email: 'a@b.com', password: 'wrong-password' })
        .catch((error: UnauthorizedException) => error.message);

      expect(wrongPasswordError).toBe(unknownEmailError);
    });
  });
});
