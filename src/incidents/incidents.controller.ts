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
import { Incident } from './incident.entities.js';
import { IncidentsService } from './incidents.service.js';
import {
  ChangeIncidentStatusDto,
  CreateIncidentDto,
  IncidentsQueryDto,
  UpdateIncidentDto,
} from './incidents.dto.js';

@ApiTags('Incidentes')
@ApiBearerAuth()
@ApiForbiddenResponse()
@ApiNotFoundResponse()
@Can.Anyone()
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @ApiOkResponse({ type: [Incident] })
  @Get()
  findAll(@Query() q: IncidentsQueryDto, @CurrentUser() user: User) {
    return this.incidents.findAll(q, user);
  }

  @ApiOkResponse({ type: Incident })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.incidents.findOwned(id, user);
  }

  @ApiCreatedResponse({ type: Incident })
  @ApiConflictResponse({
    description: 'Ya hay un incidente abierto del mismo tipo',
  })
  @Post()
  create(@Body() dto: CreateIncidentDto, @CurrentUser() user: User) {
    return this.incidents.create(dto, user);
  }

  @ApiOkResponse({ type: Incident })
  @ApiConflictResponse({ description: 'El incidente está cerrado' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: User,
  ) {
    return this.incidents.update(id, dto, user);
  }

  @ApiOkResponse({ type: Incident })
  @ApiConflictResponse({ description: 'Transición de estado no permitida' })
  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeIncidentStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.incidents.changeStatus(id, dto, user);
  }

  @ApiNoContentResponse()
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.incidents.remove(id, user);
  }
}
