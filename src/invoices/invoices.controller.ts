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
  ApiBadRequestResponse,
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
import { Invoice } from './invoice.entity.js';
import { InvoicesService } from './invoices.service.js';
import {
  CreateInvoiceDto,
  InvoicesQueryDto,
  PayInvoiceDto,
  UpdateInvoiceDto,
} from './invoices.dto.js';

@ApiTags('Facturas')
@ApiBearerAuth()
@ApiForbiddenResponse({
  description: 'La factura es de un hogar de otro usuario',
})
@ApiNotFoundResponse()
@Can.Anyone()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @ApiOkResponse({ type: [Invoice] })
  @Get()
  findAll(@Query() q: InvoicesQueryDto, @CurrentUser() user: User) {
    return this.invoices.findAll(q, user);
  }

  @ApiOkResponse({ type: Invoice })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.invoices.findOwned(id, user);
  }

  @ApiCreatedResponse({ type: Invoice })
  @ApiConflictResponse({
    description: 'Ya existe una factura del servicio en ese periodo',
  })
  @ApiBadRequestResponse({ description: 'Fechas incoherentes' })
  @Post()
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: User) {
    return this.invoices.create(dto, user);
  }

  @ApiOkResponse({ type: Invoice })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: User,
  ) {
    return this.invoices.update(id, dto, user);
  }

  @ApiOkResponse({ type: Invoice })
  @ApiConflictResponse({ description: 'Ya estaba pagada' })
  @HttpCode(200)
  @Post(':id/pay')
  pay(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayInvoiceDto,
    @CurrentUser() user: User,
  ) {
    return this.invoices.pay(id, dto, user);
  }

  @ApiOkResponse({ type: Invoice })
  @ApiConflictResponse({ description: 'No estaba pagada' })
  @HttpCode(200)
  @Post(':id/unpay')
  unpay(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.invoices.unpay(id, user);
  }

  @ApiNoContentResponse()
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.invoices.remove(id, user);
  }
}
