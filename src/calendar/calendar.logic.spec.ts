import {
  buildCalendarEvents,
  type CalendarInvoice,
  type CalendarTax,
} from './calendar.logic.js';
import { CalendarService } from './calendar.service.js';
import { lucas } from '../../test/helpers.js';

const inv = (over: Partial<CalendarInvoice> = {}): CalendarInvoice => ({
  id: 1,
  dueDate: '2026-11-05',
  paidAt: null,
  status: 'pendiente',
  amount: 100,
  period: '2026-10',
  service: { type: 'energia', provider: 'Enel' },
  ...over,
});

describe('buildCalendarEvents', () => {
  it('una factura pagada antes del vencimiento aparece dos veces: vencimiento y pago', () => {
    const events = buildCalendarEvents(
      [inv({ status: 'pagada', paidAt: '2026-11-02' })],
      [],
      '2026-11',
      '2026-11-18',
    );
    expect(events.map((e) => [e.date, e.kind])).toEqual([
      ['2026-11-02', 'payment'],
      ['2026-11-05', 'due'],
    ]);
    expect(events[0]).toMatchObject({ dueDate: '2026-11-05', state: 'paid' });
  });

  it('pagada el mismo día o pendiente: un solo evento con su estado', () => {
    expect(
      buildCalendarEvents(
        [inv({ status: 'pagada', paidAt: '2026-11-05' })],
        [],
        '2026-11',
        '2026-11-18',
      ),
    ).toHaveLength(1);
    expect(
      buildCalendarEvents([inv()], [], '2026-11', '2026-11-18')[0].state,
    ).toBe('overdue');
    expect(
      buildCalendarEvents(
        [inv({ dueDate: '2026-11-20' })],
        [],
        '2026-11',
        '2026-11-18',
      )[0].state,
    ).toBe('due_soon');
    expect(
      buildCalendarEvents(
        [inv({ dueDate: '2026-11-30' })],
        [],
        '2026-11',
        '2026-11-18',
      )[0].state,
    ).toBe('pending');
  });

  it('solo incluye eventos del mes pedido y agrega los impuestos', () => {
    const taxes: CalendarTax[] = [
      {
        id: 7,
        type: 'predial',
        dueDate: '2026-11-10',
        status: 'pendiente',
        paidAt: null,
        amount: 9,
        year: 2026,
      },
      {
        id: 8,
        type: 'vehicular',
        dueDate: '2026-11-25',
        status: 'pagado',
        paidAt: '2026-11-01',
        amount: 9,
        year: 2026,
      },
      {
        id: 9,
        type: 'valorizacion',
        dueDate: '2026-12-01',
        status: 'pendiente',
        paidAt: null,
        amount: 9,
        year: 2026,
      },
    ];
    const events = buildCalendarEvents(
      [inv({ dueDate: '2026-12-05', service: undefined })],
      taxes,
      '2026-11',
      '2026-11-18',
    );
    expect(events.map((e) => [e.id, e.state])).toEqual([
      ['tax-7', 'overdue'],
      ['tax-8', 'paid'],
    ]);
  });
});

describe('CalendarService', () => {
  it('combina facturas e impuestos del hogar', async () => {
    const invoices = {
      findAll: vi.fn(async () => [inv({ dueDate: '2026-11-30' })]),
    };
    const taxes = { findAll: vi.fn(async () => []) };
    const service = new CalendarService(invoices as never, taxes as never);
    const events = await service.events(
      { householdId: 1, month: '2026-11' },
      lucas,
    );
    expect(invoices.findAll).toHaveBeenCalledWith({ householdId: 1 }, lucas);
    expect(events).toHaveLength(1);
  });
});
