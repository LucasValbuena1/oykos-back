import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { CalendarService } from './calendar.service.js';
import { CalendarQueryDto } from './calendar.dto.js';
import type { User } from '../users/user.entity.js';

@ApiTags('Calendario')
@ApiBearerAuth()
@Can.Anyone()
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @ApiOkResponse({
    description: 'Vencimientos y pagos del mes (facturas e impuestos)',
  })
  @Get()
  events(@Query() q: CalendarQueryDto, @CurrentUser() user: User) {
    return this.calendar.events(q, user);
  }
}
