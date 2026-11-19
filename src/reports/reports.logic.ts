export type ReportType = 'consumo' | 'gastos' | 'impuestos';

export interface ReportInvoice {
  period: string;
  amount: number;
  consumption: number;
  status: string;
  service?: { type: string; provider: string };
}
export interface ReportTax {
  year: number;
  type: string;
  amount: number;
  dueDate: string;
  status: string;
}

export interface ReportData {
  type: ReportType;
  from: string;
  to: string;
  total: number;
  previousTotal: number;
  /** Variación % frente al periodo anterior de la misma duración (null sin base). */
  variation: number | null;
  byService: { key: string; consumption: number; amount: number }[];
  monthly: { period: string; value: number }[];
}

/** Lista de periodos YYYY-MM entre from y to (incluidos). */
export function periodRange(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

/** Ventana del mismo tamaño justo antes de [from, to]. */
export function previousWindow(from: string, to: string): [string, string] {
  const len = periodRange(from, to).length;
  let [y, m] = from.split('-').map(Number);
  const back = (n: number) => {
    m -= n;
    while (m < 1) {
      m += 12;
      y--;
    }
    return `${y}-${String(m).padStart(2, '0')}`;
  };
  const prevTo = back(1);
  const prevFrom = back(len - 1);
  return [prevFrom, prevTo];
}

const round = (n: number) => Math.round(n * 100) / 100;

export function buildReport(
  type: ReportType,
  from: string,
  to: string,
  invoices: ReportInvoice[],
  taxes: ReportTax[],
): ReportData {
  const periods = periodRange(from, to);
  const [pf, pt] = previousWindow(from, to);
  const within = (p: string, a: string, b: string) => p >= a && p <= b;

  if (type === 'impuestos') {
    const cur = taxes.filter((t) => within(t.dueDate.slice(0, 7), from, to));
    const prev = taxes.filter((t) => within(t.dueDate.slice(0, 7), pf, pt));
    const byKey = new Map<string, number>();
    for (const t of cur) byKey.set(t.type, (byKey.get(t.type) ?? 0) + t.amount);
    const total = cur.reduce((s, t) => s + t.amount, 0);
    const previousTotal = prev.reduce((s, t) => s + t.amount, 0);
    return {
      type,
      from,
      to,
      total,
      previousTotal,
      variation:
        previousTotal > 0
          ? round(((total - previousTotal) / previousTotal) * 100)
          : null,
      byService: [...byKey].map(([key, amount]) => ({
        key,
        consumption: 0,
        amount,
      })),
      monthly: periods.map((p) => ({
        period: p,
        value: cur
          .filter((t) => t.dueDate.startsWith(p))
          .reduce((s, t) => s + t.amount, 0),
      })),
    };
  }

  const metric = (i: ReportInvoice) =>
    type === 'consumo' ? i.consumption : i.amount;
  const cur = invoices.filter((i) => within(i.period, from, to));
  const prev = invoices.filter((i) => within(i.period, pf, pt));
  const byKey = new Map<string, { consumption: number; amount: number }>();
  for (const i of cur) {
    const key = i.service?.type ?? 'otro';
    const acc = byKey.get(key) ?? { consumption: 0, amount: 0 };
    acc.consumption += i.consumption;
    acc.amount += i.amount;
    byKey.set(key, acc);
  }
  const total = cur.reduce((s, i) => s + metric(i), 0);
  const previousTotal = prev.reduce((s, i) => s + metric(i), 0);
  return {
    type,
    from,
    to,
    total,
    previousTotal,
    variation:
      previousTotal > 0
        ? round(((total - previousTotal) / previousTotal) * 100)
        : null,
    byService: [...byKey].map(([key, v]) => ({ key, ...v })),
    monthly: periods.map((p) => ({
      period: p,
      value: cur
        .filter((i) => i.period === p)
        .reduce((s, i) => s + metric(i), 0),
    })),
  };
}
