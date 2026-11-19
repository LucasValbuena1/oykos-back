import {
  base64Bytes,
  matchService,
  monthlyFacts,
  sanitizeExtraction,
  sanitizeRecommendations,
  validateReceiptFile,
} from './ai.logic.js';

const f = (value: unknown, confidence = 0.9) => ({ value, confidence });
const raw = {
  provider: f('Enel Colombia'),
  serviceType: f('energia'),
  reference: f('900100'),
  amount: f(231000),
  consumption: f(260),
  period: f('2026-10'),
  cutoffDate: f('2026-10-15'),
  dueDate: f('2026-11-05'),
};

describe('ai.logic', () => {
  it('valida el archivo del recibo', () => {
    expect(validateReceiptFile('image/gif', 'AAAA')).toMatch(/Formato/);
    expect(validateReceiptFile('image/png', 'no es base64!')).toMatch(/base64/);
    expect(validateReceiptFile('image/png', 'A'.repeat(8_000_000))).toMatch(
      /5 MB/,
    );
    expect(validateReceiptFile('application/pdf', 'QUJD')).toBeNull();
    expect(base64Bytes('QUJD')).toBe(3);
  });

  it('conserva los campos válidos con buena confianza', () => {
    const ex = sanitizeExtraction(raw);
    expect(ex.amount).toEqual({ value: 231000, confidence: 0.9 });
    expect(ex.serviceType.value).toBe('energia');
  });

  it('descarta valores inválidos, con poca confianza o fechas incoherentes', () => {
    const ex = sanitizeExtraction({
      ...raw,
      amount: f(-5),
      period: f('10/2026'),
      provider: f('Enel', 0.2),
      serviceType: f('telefonia'),
      cutoffDate: f('2026-12-01'),
      reference: f(7, 2),
    });
    expect(ex.amount.value).toBeNull();
    expect(ex.period.value).toBeNull();
    expect(ex.provider).toEqual({ value: null, confidence: 0.2 });
    expect(ex.serviceType.value).toBeNull();
    expect(ex.cutoffDate.value).toBeNull();
    expect(ex.reference).toEqual({ value: null, confidence: 1 });
    expect(sanitizeExtraction(null).dueDate).toEqual({
      value: null,
      confidence: 0,
    });
  });

  it('encuentra el servicio del hogar por empresa y tipo', () => {
    const services = [
      { id: 1, type: 'energia' as const, provider: 'Enel Colombia' },
      { id: 2, type: 'agua' as const, provider: 'Acueducto de Bogotá' },
    ];
    expect(matchService(sanitizeExtraction(raw), services)?.id).toBe(1);
    expect(
      matchService(
        sanitizeExtraction({
          ...raw,
          provider: f('ACUEDUCTO'),
          serviceType: f('agua'),
        }),
        services,
      )?.id,
    ).toBe(2);
    expect(
      matchService(sanitizeExtraction({ ...raw, provider: f(null) }), services)
        ?.id,
    ).toBe(1);
    expect(
      matchService(
        sanitizeExtraction({
          ...raw,
          provider: f('Vanti'),
          serviceType: f('gas'),
        }),
        services,
      ),
    ).toBeNull();
  });

  const invoices = [
    {
      period: '2026-09',
      amount: 100,
      consumption: 10,
      service: { id: 1, type: 'energia' as const, provider: 'Enel' },
    },
    {
      period: '2026-10',
      amount: 200,
      consumption: 20,
      service: { id: 1, type: 'energia' as const, provider: 'Enel' },
    },
    {
      period: '2026-10',
      amount: 50,
      consumption: 5,
      service: { id: 2, type: 'agua' as const, provider: 'EAAB' },
    },
  ];

  it('calcula promedios solo para servicios con historial suficiente', () => {
    expect(monthlyFacts(invoices)).toEqual([
      {
        serviceType: 'energia',
        provider: 'Enel',
        avgConsumption: 15,
        avgAmount: 150,
        lastAmount: 200,
        months: 2,
      },
    ]);
  });

  it('filtra recomendaciones inválidas y limita el ahorro', () => {
    const facts = monthlyFacts(invoices);
    const recs = sanitizeRecommendations(
      {
        recommendations: [
          {
            serviceType: 'energia',
            title: 'Apaga el standby',
            reason: 'Los equipos en espera consumen hasta un 10 %.',
            estimatedSaving: 999999,
          },
          {
            serviceType: 'gas',
            title: 'X',
            reason: 'Servicio que no existe en el hogar',
            estimatedSaving: 10,
          },
          { serviceType: 'energia', title: '', reason: 'corto' },
        ],
      },
      facts,
    );
    expect(recs).toEqual([
      {
        serviceType: 'energia',
        title: 'Apaga el standby',
        reason: 'Los equipos en espera consumen hasta un 10 %.',
        estimatedSaving: 75,
      },
    ]);
    expect(sanitizeRecommendations('basura', facts)).toEqual([]);
  });
});
