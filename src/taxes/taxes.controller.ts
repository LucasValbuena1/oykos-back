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
import { Tax } from './tax.entity.js';
import { TaxesService } from './taxes.service.js';
import {
  CreateTaxDto,
  PayTaxDto,
  TaxesQueryDto,
  UpdateTaxDto,
} from './taxes.dto.js';

@ApiTags('Impuestos')
@ApiBearerAuth()
@ApiForbiddenResponse()
@ApiNotFoundResponse()
@Can.Anyone()
@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxes: TaxesService) {}

  @ApiOkResponse({ type: [Tax] })
  @Get()
  findAll(@Query() q: TaxesQueryDto, @CurrentUser() user: User) {
    return this.taxes.findAll(q, user);
  }

  @ApiOkResponse({ type: Tax })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.taxes.findOwned(id, user);
  }

  @ApiCreatedResponse({ type: Tax })
  @ApiConflictResponse({
    description: 'Impuesto repetido para el bien y el año',
  })
  @Post()
  create(@Body() dto: CreateTaxDto, @CurrentUser() user: User) {
    return this.taxes.create(dto, user);
  }

  @ApiOkResponse({ type: Tax })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaxDto,
    @CurrentUser() user: User,
  ) {
    return this.taxes.update(id, dto, user);
  }

  @ApiOkResponse({ type: Tax })
  @HttpCode(200)
  @Post(':id/pay')
  pay(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayTaxDto,
    @CurrentUser() user: User,
  ) {
    return this.taxes.pay(id, dto, user);
  }

  @ApiNoContentResponse()
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.taxes.remove(id, user);
  }
}
