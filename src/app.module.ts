import {
  ClassSerializerInterceptor,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthenticationModule } from '@nestjs/authentication';
import { AuthorizationModule } from '@nestjs/authorization';
import { QueryFailedFilter } from './common/query-failed.filter.js';
import { LoggingMiddleware } from './common/logging.middleware.js';
import { HealthController } from './health.controller.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HouseholdsModule } from './households/households.module.js';
import { HouseholdPolicy } from './households/household.policy.js';
import { ServicesModule } from './services/services.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { CalendarModule } from './calendar/calendar.module.js';
import { VehiclesModule } from './vehicles/vehicles.module.js';
import { TaxesModule } from './taxes/taxes.module.js';
import { AlertsModule } from './alerts/alerts.module.js';
import { IncidentsModule } from './incidents/incidents.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { AiModule } from './ai/ai.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get('DB_PORT', 5433)),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        // El esquema lo crea db/init.sql del repo de base de datos.
        synchronize: false,
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        accessToken: {
          key: config.getOrThrow<string>('JWT_SECRET'),
          issuer: 'oykos-api',
          audience: 'oykos-clients',
          ttl: '15m',
        },
        refreshToken: { ttl: '7d', absoluteTtl: '30d' },
      }),
    }),
    AuthorizationModule.forRoot({ policies: [HouseholdPolicy] }),
    UsersModule,
    AuthModule,
    HouseholdsModule,
    ServicesModule,
    InvoicesModule,
    CalendarModule,
    VehiclesModule,
    TaxesModule,
    AlertsModule,
    IncidentsModule,
    ReportsModule,
    AiModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: QueryFailedFilter },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*path');
  }
}
