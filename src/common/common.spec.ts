import { QueryFailedError } from 'typeorm';
import { QueryFailedFilter } from './query-failed.filter.js';
import { LoggingMiddleware } from './logging.middleware.js';
import { numeric } from './numeric.transformer.js';
import { daysBetween, previousPeriod, today } from './dates.js';

describe('QueryFailedFilter', () => {
  const run = (code?: string) => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) };
    const err = Object.assign(new QueryFailedError('q', [], new Error('x')), {
      code,
    });
    new QueryFailedFilter().catch(err, host as never);
    return { status, json };
  };
  it('traduce los errores de PostgreSQL a 409/400 y lo demás a 500', () => {
    expect(run('23505').status).toHaveBeenCalledWith(409);
    expect(run('23514').status).toHaveBeenCalledWith(400);
    expect(run('99999').status).toHaveBeenCalledWith(500);
    expect(run(undefined).json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Error interno' }),
    );
  });
});

describe('LoggingMiddleware', () => {
  it('registra la petición cuando termina', () => {
    let finish = () => {};
    const res = {
      statusCode: 200,
      on: (_e: string, cb: () => void) => (finish = cb),
    };
    const next = vi.fn();
    const mw = new LoggingMiddleware();
    const log = vi
      .spyOn((mw as unknown as { logger: { log: () => void } }).logger, 'log')
      .mockImplementation(() => {});
    mw.use(
      { method: 'GET', originalUrl: '/health' } as never,
      res as never,
      next,
    );
    expect(next).toHaveBeenCalled();
    finish();
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/health 200 \d+ms$/),
    );
  });
});

describe('utilidades', () => {
  it('convierte NUMERIC y maneja fechas', () => {
    expect(numeric.from('12.50')).toBe(12.5);
    expect(numeric.from(null)).toBeNull();
    expect(numeric.to(3)).toBe(3);
    expect(today(new Date(2026, 0, 9))).toBe('2026-01-09');
    expect(previousPeriod('2026-01')).toBe('2025-12');
    expect(previousPeriod('2026-11')).toBe('2026-10');
    expect(daysBetween('2026-11-01', '2026-11-18')).toBe(17);
  });
});
