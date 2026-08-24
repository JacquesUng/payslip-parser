import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import authConfig from '../config/auth.config';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

const BCRYPT_SALT_ROUNDS = 10;
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY) private readonly config: ConfigType<typeof authConfig>,
  ) {}

  async signup(dto: SignupDto): Promise<{ user: User; token: string }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.create({ email: dto.email, passwordHash });

    return { user, token: this.signToken(user) };
  }

  async login(dto: LoginDto): Promise<{ user: User; token: string }> {
    const user = await this.validateCredentials(dto.email, dto.password);
    return { user, token: this.signToken(user) };
  }

  private async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }
    return user;
  }

  private signToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload, { secret: this.config.jwtSecret });
  }
}
