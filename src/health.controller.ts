import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@nestjs/authentication';

@ApiTags('Salud')
@Public()
@Controller('health')
export class HealthController {
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  @Get()
  health() {
    return { status: 'ok' };
  }
}
