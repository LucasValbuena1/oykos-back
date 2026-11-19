import { BadRequestException } from '@nestjs/common';
import { buildReport, periodRange, previousWindow } from './reports.logic.js';
import { ReportsService } from './reports.service.js';
import { lucas } from '../../test/helpers.js';

const inv = (
  period: string,
  amount: number,
  consumption: number,
  type = 'energia',
) => ({
  period,
  amount,
  consumption,
  status: 'pagada',
  service: { type, provider: 'X' },
});

describe('reports.logic', () => {
  it('calcula el rango y la ventana anterior, incluso cruzando de año', () => {
    expect(periodRange('2026-11', '2027-02')).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
    expect(previousWindow('2026-01', '2026-03')).toEqual([
      '2025-10',
      '2025-12',
    ]);
    expect(previousWindow('2026-05', '2026-05')).toEqual([
      '2026-04',
      '2026-04',
    ]);
  });

  it('reporte de gastos: total, variación, desglose por servicio y serie mensual', () => {
    const r = buildReport(
      'gastos',
      '2026-09',
      '2026-10',
      [
        inv('2026-07', 100, 1),
        inv('2026-08', 100, 1),
        inv('2026-09', 150, 2),
        inv('2026-10', 250, 3, 'agua'),
      ],
      [],
    );
    expect(r).toMatchObject({ total: 400, previousTotal: 200, variation: 100 });
    expect(r.byService).toEqual([
      { key: 'energia', consumption: 2, amount: 150 },
      { key: 'agua', consumption: 3, amount: 250 },
    ]);
    expect(r.monthly).toEqual([
      { period: '2026-09', value: 150 },
      { period: '2026-10', value: 250 },
    ]);
  });

  it('reporte de consumo usa el consumo; sin base no hay variación', () => {
    const r = buildReport(
      'consumo',
      '2026-10',
      '2026-10',
      [inv('2026-10', 100, 30)],
      [],
    );
    expect(r).toMatchObject({ total: 30, previousTotal: 0, variation: null });
  });

  it('reporte de impuestos agrupa por tipo según la fecha límite', () => {
    const taxes = [
      {
        year: 2026,
        type: 'predial',
        amount: 1000,
        dueDate: '2026-07-10',
        status: 'pagado',
      },
      {
        year: 2026,
        type: 'vehicular',
        amount: 500,
        dueDate: '2026-07-20',
        status: 'pendiente',
      },
      {
        year: 2026,
        type: 'predial',
        amount: 800,
        dueDate: '2026-06-10',
        status: 'pagado',
      },
    ];
    const r = buildReport('impuestos', '2026-07', '2026-07', [], taxes);
    expect(r).toMatchObject({
      total: 1500,
      previousTotal: 800,
      variation: 87.5,
    });
    expect(r.byService).toHaveLength(2);
  });
});

describe('ReportsService', () => {
  const invoices = { findAll: vi.fn(async () => [inv('2026-10', 100, 1)]) };
  const taxes = { findAll: vi.fn(async () => []) };
  const service = new ReportsService(invoices as never, taxes as never);

  it('valida el rango antes de consultar', async () => {
    await expect(
      service.generate(
        { householdId: 1, type: 'gastos', from: '2026-10', to: '2026-01' },
        lucas,
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.generate(
        { householdId: 1, type: 'gastos', from: '2020-01', to: '2026-01' },
        lucas,
      ),
    ).rejects.toThrow(/24 meses/);
  });

  it('consulta facturas o impuestos según el tipo', async () => {
    const r = await service.generate(
      { householdId: 1, type: 'gastos', from: '2026-10', to: '2026-10' },
      lucas,
    );
    expect(r).toMatchObject({ householdId: 1, total: 100 });
    await service.generate(
      { householdId: 1, type: 'impuestos', from: '2026-10', to: '2026-10' },
      lucas,
    );
    expect(taxes.findAll).toHaveBeenCalledTimes(1);
  });
});
