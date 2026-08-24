import { registerAs } from '@nestjs/config';

const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;

export default registerAs('auth', () => ({
  jwtSecret: process.env['JWT_SECRET'] ?? 'dev-only-insecure-secret-change-me',
  cookieName: 'payslip_auth_token',
  cookieMaxAgeMs: TEN_YEARS_MS,
}));
