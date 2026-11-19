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
import { UtilityService } from './service.entity.js';
import { ServicesService } from './services.service.js';
import {
  CreateServiceDto,
  ServicesQueryDto,
  UpdateServiceDto,
} from './services.dto.js';

@ApiTags('Servicios')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'El hogar es de otro usuario' })
@ApiNotFoundResponse()
@Can.Anyone()
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @ApiOkResponse({ type: [UtilityService] })
  @Get()
  findAll(@Query() q: ServicesQueryDto, @CurrentUser() user: User) {
    return this.services.findByHousehold(q.householdId, user);
  }

  @ApiOkResponse({ type: UtilityService })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.services.findOwned(id, user);
  }

  @ApiCreatedResponse({ type: UtilityService })
  @ApiConflictResponse({ description: 'Servicio duplicado en el hogar' })
  @Post()
  create(@Body() dto: CreateServiceDto, @CurrentUser() user: User) {
    return this.services.create(dto, user);
  }

  @ApiOkResponse({ type: UtilityService })
  @ApiConflictResponse({ description: 'Servicio duplicado en el hogar' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() user: User,
  ) {
    return this.services.update(id, dto, user);
  }

  @ApiNoContentResponse()
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.services.remove(id, user);
  }
}
