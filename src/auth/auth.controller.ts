import {
  Body,
  Controller,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public, TokenService } from '@nestjs/authentication';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from '../users/users.service.js';
import { User } from '../users/user.entity.js';
import { LoginDto, RefreshDto, RegisterDto, TokenPairDto } from './auth.dto.js';

@ApiTags('Autenticación')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
  ) {}

  @ApiCreatedResponse({ type: User })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.users.register(dto);
  }

  @ApiOkResponse({ type: TokenPairDto })
  @ApiUnauthorizedResponse({
    description:
      'Credenciales inválidas (el mismo mensaje si el correo no existe)',
  })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('token')
  async token(@Body() dto: LoginDto) {
    const user = await this.users.verifyCredentials(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    return this.tokens.issue(String(user.id), { method: 'password' });
  }

  @ApiOkResponse({ type: TokenPairDto })
  @ApiUnauthorizedResponse({
    description: 'Refresh token inválido, vencido o reutilizado',
  })
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.tokens.refresh(dto.refreshToken);
  }

  @ApiNoContentResponse({ description: 'Cierra la sesión de este dispositivo' })
  @HttpCode(204)
  @Post('logout')
  async logout(@Body() dto: RefreshDto) {
    await this.tokens.revoke(dto.refreshToken);
  }
}
