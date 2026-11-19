import {
  displayStatus,
  type InvoiceStatus,
} from '../invoices/invoice.entity.js';
import { today } from '../common/dates.js';

export interface CalendarInvoice {
  id: number;
  dueDate: string;
  paidAt: string | null;
  status: InvoiceStatus;
  amount: number;
  period: string;
  service?: { type: string; provider: string };
}
export interface CalendarTax {
  id: number;
  type: string;
  dueDate: string;
  status: 'pendiente' | 'pagado';
  paidAt: string | null;
  amount: number;
  year: number;
}

export interface CalendarEvent {
  id: string;
  date: string;
  /** due: vence ese día · payment: ese día se registró el pago. */
  kind: 'due' | 'payment';
  source: 'invoice' | 'tax';
  sourceId: number;
  title: string;
  amount: number;
  state: 'paid' | 'overdue' | 'due_soon' | 'pending';
  dueDate: string;
  paidAt: string | null;
}

const STATE = {
  pagada: 'paid',
  vencida: 'overdue',
  por_vencer: 'due_soon',
  pendiente: 'pending',
} as const;

/**
 * Arma los eventos del mes: cada factura aparece en su fecha límite, y si se pagó
 * otro día, también el día del pago (con la fecha límite para comparar).
 */
export function buildCalendarEvents(
  invoices: CalendarInvoice[],
  taxes: CalendarTax[],
  month: string,
  now = today(),
): CalendarEvent[] {
  const inMonth = (d: string | null) => !!d && d.startsWith(month);
  const events: CalendarEvent[] = [];
  for (const i of invoices) {
    const title = i.service
      ? `${i.service.type} · ${i.service.provider} (${i.period})`
      : `Factura ${i.period}`;
    const state = STATE[displayStatus(i, now)];
    if (inMonth(i.dueDate)) {
      events.push({
        id: `inv-${i.id}`,
        date: i.dueDate,
        kind: 'due',
        source: 'invoice',
        sourceId: i.id,
        title,
        amount: i.amount,
        state,
        dueDate: i.dueDate,
        paidAt: i.paidAt,
      });
    }
    if (
      i.status === 'pagada' &&
      i.paidAt &&
      i.paidAt !== i.dueDate &&
      inMonth(i.paidAt)
    ) {
      events.push({
        id: `inv-${i.id}-pago`,
        date: i.paidAt,
        kind: 'payment',
        source: 'invoice',
        sourceId: i.id,
        title,
        amount: i.amount,
        state: 'paid',
        dueDate: i.dueDate,
        paidAt: i.paidAt,
      });
    }
  }
  for (const t of taxes) {
    if (!inMonth(t.dueDate)) continue;
    const state =
      t.status === 'pagado' ? 'paid' : t.dueDate < now ? 'overdue' : 'pending';
    events.push({
      id: `tax-${t.id}`,
      date: t.dueDate,
      kind: 'due',
      source: 'tax',
      sourceId: t.id,
      title: `Impuesto ${t.type} ${t.year}`,
      amount: t.amount,
      state,
      dueDate: t.dueDate,
      paidAt: t.paidAt,
    });
  }
  return events.sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
}
