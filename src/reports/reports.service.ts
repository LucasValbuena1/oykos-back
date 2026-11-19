import { BadRequestException, Injectable } from '@nestjs/common';
import { InvoicesService } from '../invoices/invoices.service.js';
import { TaxesService } from '../taxes/taxes.service.js';
import { buildReport, periodRange } from './reports.logic.js';
import type { ReportQueryDto } from './reports.dto.js';
import type { User } from '../users/user.entity.js';

export const MAX_REPORT_MONTHS = 24;

@Injectable()
export class ReportsService {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly taxes: TaxesService,
  ) {}

  async generate(q: ReportQueryDto, user: User) {
    if (q.from > q.to)
      throw new BadRequestException('from no puede ser posterior a to');
    if (periodRange(q.from, q.to).length > MAX_REPORT_MONTHS) {
      throw new BadRequestException(
        `Un reporte cubre máximo ${MAX_REPORT_MONTHS} meses`,
      );
    }
    const isTax = q.type === 'impuestos';
    const [invoices, taxes] = await Promise.all([
      isTax
        ? Promise.resolve([])
        : this.invoices.findAll({ householdId: q.householdId }, user),
      isTax
        ? this.taxes.findAll({ householdId: q.householdId }, user)
        : Promise.resolve([]),
    ]);
    return {
      householdId: q.householdId,
      ...buildReport(q.type, q.from, q.to, invoices, taxes),
    };
  }
}
