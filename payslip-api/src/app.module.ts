import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'node:path';
import authConfig from './config/auth.config';
import storageConfig from './config/storage.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PayslipsModule } from './payslips/payslips.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [storageConfig, authConfig] }),
    TypeOrmModule.forRootAsync({
      inject: [storageConfig.KEY],
      useFactory: (config: ConfigType<typeof storageConfig>) => ({
        type: 'better-sqlite3' as const,
        database: join(config.root, 'payslips.sqlite'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    UsersModule,
    AuthModule,
    PayslipsModule,
    HealthModule,
  ],
})
export class AppModule {}
