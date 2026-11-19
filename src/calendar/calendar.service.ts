import { Injectable } from '@nestjs/common';
import { InvoicesService } from '../invoices/invoices.service.js';
import { TaxesService } from '../taxes/taxes.service.js';
import { buildCalendarEvents } from './calendar.logic.js';
import type { CalendarQueryDto } from './calendar.dto.js';
import type { User } from '../users/user.entity.js';

@Injectable()
export class CalendarService {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly taxes: TaxesService,
  ) {}

  async events(q: CalendarQueryDto, user: User) {
    const [invoices, taxes] = await Promise.all([
      this.invoices.findAll({ householdId: q.householdId }, user),
      this.taxes.findAll({ householdId: q.householdId }, user),
    ]);
    return buildCalendarEvents(invoices, taxes, q.month);
  }
}
