import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './invoice.entity.js';
import { InvoicesService } from './invoices.service.js';
import { InvoicesController } from './invoices.controller.js';
import { ServicesModule } from '../services/services.module.js';
import { AlertsModule } from '../alerts/alerts.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice]), ServicesModule, AlertsModule],
  providers: [InvoicesService],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
