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
import { Household } from './household.entity.js';
import { HouseholdsService } from './households.service.js';
import { CreateHouseholdDto, UpdateHouseholdDto } from './households.dto.js';

@ApiTags('Hogares')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'El hogar es de otro usuario' })
@Can.Anyone()
@Controller('households')
export class HouseholdsController {
  constructor(private readonly households: HouseholdsService) {}

  @ApiOkResponse({ type: [Household] })
  @Get()
  findAll(@CurrentUser() user: User) {
    return this.households.findAllFor(user);
  }

  @ApiOkResponse({ type: Household })
  @ApiNotFoundResponse()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.households.findOwned(id, user);
  }

  @ApiCreatedResponse({ type: Household })
  @ApiConflictResponse({ description: 'Nombre repetido o límite de hogares' })
  @Post()
  create(@Body() dto: CreateHouseholdDto, @CurrentUser() user: User) {
    return this.households.create(dto, user);
  }

  @ApiOkResponse({ type: Household })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHouseholdDto,
    @CurrentUser() user: User,
  ) {
    return this.households.update(id, dto, user);
  }

  @ApiNoContentResponse({
    description: 'Borra el hogar y todo lo que cuelga de él',
  })
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.households.remove(id, user);
  }
}
