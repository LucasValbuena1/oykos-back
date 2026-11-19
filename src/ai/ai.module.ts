import { Module } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { AiController } from './ai.controller.js';
import { ClaudeClient } from './claude.client.js';
import { ServicesModule } from '../services/services.module.js';
import { InvoicesModule } from '../invoices/invoices.module.js';

@Module({
  imports: [ServicesModule, InvoicesModule],
  providers: [AiService, ClaudeClient],
  controllers: [AiController],
})
export class AiModule {}
