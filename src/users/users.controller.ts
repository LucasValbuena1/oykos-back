import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, TokenService } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';
import { ChangePasswordDto, UpdateProfileDto } from './users.dto.js';

@ApiTags('Usuarios')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token o venció' })
@Can.Anyone()
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
  ) {}

  @ApiOkResponse({ type: User })
  @Get('me')
  me(@CurrentUser() user: User) {
    return user;
  }

  @ApiOkResponse({ type: User })
  @Patch('me')
  update(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user, dto);
  }

  @ApiNoContentResponse({
    description: 'Contraseña cambiada; se cierran las sesiones abiertas',
  })
  @HttpCode(204)
  @Post('me/password')
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.users.changePassword(user, dto);
    await this.tokens.revokeAll(String(user.id));
  }
}
