import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import type { User } from '../users/user.entity.js';
import { AlertRule, AppNotification } from './alert.entities.js';
import { AlertsService } from './alerts.service.js';
import {
  CreateAlertRuleDto,
  HouseholdQueryDto,
  UpdateAlertRuleDto,
} from './alerts.dto.js';

@ApiTags('Alertas')
@ApiBearerAuth()
@ApiForbiddenResponse()
@ApiNotFoundResponse()
@Can.Anyone()
@Controller()
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @ApiOkResponse({ type: [AlertRule] })
  @Get('alert-rules')
  findRules(@Query() q: HouseholdQueryDto, @CurrentUser() user: User) {
    return this.alerts.findRules(q.householdId, user);
  }

  @ApiCreatedResponse({ type: AlertRule })
  @ApiConflictResponse({
    description: 'Regla repetida o límite de reglas activas',
  })
  @Post('alert-rules')
  create(@Body() dto: CreateAlertRuleDto, @CurrentUser() user: User) {
    return this.alerts.createRule(dto, user);
  }

  @ApiOkResponse({ type: AlertRule })
  @Patch('alert-rules/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlertRuleDto,
    @CurrentUser() user: User,
  ) {
    return this.alerts.updateRule(id, dto, user);
  }

  @ApiNoContentResponse()
  @HttpCode(204)
  @Delete('alert-rules/:id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.alerts.removeRule(id, user);
  }

  @ApiOkResponse({ type: [AppNotification] })
  @Get('notifications')
  notifications(@Query() q: HouseholdQueryDto, @CurrentUser() user: User) {
    return this.alerts.findNotifications(q.householdId, user);
  }

  @ApiOkResponse({ type: AppNotification })
  @HttpCode(200)
  @Post('notifications/:id/read')
  markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.alerts.markRead(id, user);
  }
}
