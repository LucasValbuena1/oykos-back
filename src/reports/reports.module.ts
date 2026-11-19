import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module.js';
import { TaxesModule } from '../taxes/taxes.module.js';
import { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';

@Module({
  imports: [InvoicesModule, TaxesModule],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
