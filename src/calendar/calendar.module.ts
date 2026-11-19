import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module.js';
import { TaxesModule } from '../taxes/taxes.module.js';
import { CalendarService } from './calendar.service.js';
import { CalendarController } from './calendar.controller.js';

@Module({
  imports: [InvoicesModule, TaxesModule],
  providers: [CalendarService],
  controllers: [CalendarController],
})
export class CalendarModule {}
