import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { JwtAuth } from './jwt.auth.js';
import { DbRefreshTokenStore } from './refresh-token.store.js';
import { RefreshTokenRow, RevokedFamilyRow } from './refresh-token.entity.js';
import './auth.types.js';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([RefreshTokenRow, RevokedFamilyRow]),
  ],
  providers: [JwtAuth, DbRefreshTokenStore],
  controllers: [AuthController],
})
export class AuthModule {}
