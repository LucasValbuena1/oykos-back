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
import { Vehicle, VehicleExpense } from './vehicle.entities.js';
import { VehiclesService } from './vehicles.service.js';
import {
  CreateExpenseDto,
  CreateVehicleDto,
  UpdateVehicleDto,
  VehiclesQueryDto,
} from './vehicles.dto.js';

@ApiTags('Vehículos')
@ApiBearerAuth()
@ApiForbiddenResponse()
@ApiNotFoundResponse()
@Can.Anyone()
@Controller()
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @ApiOkResponse({ type: [Vehicle] })
  @Get('vehicles')
  findAll(@Query() q: VehiclesQueryDto, @CurrentUser() user: User) {
    return this.vehicles.findByHousehold(q.householdId, user);
  }

  @ApiOkResponse({ type: Vehicle })
  @Get('vehicles/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.vehicles.findOwned(id, user);
  }

  @ApiCreatedResponse({ type: Vehicle })
  @ApiConflictResponse({ description: 'Placa ya registrada' })
  @Post('vehicles')
  create(@Body() dto: CreateVehicleDto, @CurrentUser() user: User) {
    return this.vehicles.create(dto, user);
  }

  @ApiOkResponse({ type: Vehicle })
  @Patch('vehicles/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() user: User,
  ) {
    return this.vehicles.update(id, dto, user);
  }

  @ApiNoContentResponse()
  @HttpCode(204)
  @Delete('vehicles/:id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.vehicles.remove(id, user);
  }

  @ApiOkResponse({ type: [VehicleExpense] })
  @Get('vehicles/:id/expenses')
  expenses(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.vehicles.findExpenses(id, user);
  }

  @ApiCreatedResponse({ type: VehicleExpense })
  @Post('vehicles/:id/expenses')
  addExpense(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateExpenseDto,
    @CurrentUser() user: User,
  ) {
    return this.vehicles.addExpense(id, dto, user);
  }

  @ApiOkResponse({ description: 'Total y gasto por categoría' })
  @Get('vehicles/:id/summary')
  summary(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.vehicles.summary(id, user);
  }

  @ApiNoContentResponse()
  @HttpCode(204)
  @Delete('vehicle-expenses/:id')
  removeExpense(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.vehicles.removeExpense(id, user);
  }
}
