import { SERVICE_TYPES, type ServiceType } from '../services/service.entity.js';
import { DATE_REGEX, PERIOD_REGEX } from '../common/patterns.js';

export const ALLOWED_MEDIA = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export const MIN_CONFIDENCE = 0.5;

export interface Field<T> {
  value: T | null;
  confidence: number;
}
export interface ReceiptExtraction {
  provider: Field<string>;
  serviceType: Field<ServiceType>;
  reference: Field<string>;
  amount: Field<number>;
  consumption: Field<number>;
  period: Field<string>;
  cutoffDate: Field<string>;
  dueDate: Field<string>;
}

/** Tamaño real en bytes de un archivo en base64. */
export const base64Bytes = (data: string) =>
  Math.floor((data.replace(/=+$/, '').length * 3) / 4);

export function validateReceiptFile(
  mediaType: string,
  data: string,
): string | null {
  if (!(ALLOWED_MEDIA as readonly string[]).includes(mediaType))
    return 'Formato no soportado: usa JPG, PNG, WEBP o PDF';
  if (!/^[A-Za-z0-9+/]+=*$/.test(data))
    return 'El archivo no está en base64 válido';
  if (base64Bytes(data) > MAX_RECEIPT_BYTES) return 'El archivo supera 5 MB';
  return null;
}

const conf = (c: unknown) =>
  typeof c === 'number' && Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 0;

function field<T>(raw: unknown, check: (v: unknown) => v is T): Field<T> {
  const f = (raw ?? {}) as { value?: unknown; confidence?: unknown };
  const c = conf(f.confidence);
  // Un valor con poca confianza se descarta: es mejor pedirlo al usuario que inventarlo.
  return f.value !== null &&
    f.value !== undefined &&
    check(f.value) &&
    c >= MIN_CONFIDENCE
    ? { value: f.value, confidence: c }
    : { value: null, confidence: c };
}

const isText = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= 80;
const isPositive = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0;
const isNonNegative = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isDate = (v: unknown): v is string =>
  typeof v === 'string' && DATE_REGEX.test(v);
const isPeriod = (v: unknown): v is string =>
  typeof v === 'string' && PERIOD_REGEX.test(v);
const isType = (v: unknown): v is ServiceType =>
  typeof v === 'string' && (SERVICE_TYPES as readonly string[]).includes(v);
const isRef = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9-]{3,40}$/.test(v);

/** Nunca confiamos en lo que devuelve el modelo: cada campo se valida antes de mostrarlo. */
export function sanitizeExtraction(raw: unknown): ReceiptExtraction {
  const r = (raw ?? {}) as Record<string, unknown>;
  const out: ReceiptExtraction = {
    provider: field(r.provider, isText),
    serviceType: field(r.serviceType, isType),
    reference: field(r.reference, isRef),
    amount: field(r.amount, isPositive),
    consumption: field(r.consumption, isNonNegative),
    period: field(r.period, isPeriod),
    cutoffDate: field(r.cutoffDate, isDate),
    dueDate: field(r.dueDate, isDate),
  };
  if (
    out.cutoffDate.value &&
    out.dueDate.value &&
    out.cutoffDate.value > out.dueDate.value
  )
    out.cutoffDate = { value: null, confidence: 0 };
  return out;
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Busca entre los servicios del hogar el que corresponde al recibo (mismo tipo y empresa parecida). */
export function matchService<
  T extends { id: number; type: ServiceType; provider: string },
>(ex: ReceiptExtraction, services: T[]): T | null {
  const provider = ex.provider.value ? norm(ex.provider.value) : null;
  const candidates = services.filter(
    (s) => !ex.serviceType.value || s.type === ex.serviceType.value,
  );
  if (provider) {
    const hit = candidates.find((s) => {
      const p = norm(s.provider);
      return (
        p.includes(provider) ||
        provider.includes(p) ||
        p.split(/\d/)[0].slice(0, 4) === provider.slice(0, 4)
      );
    });
    if (hit) return hit;
  }
  return ex.serviceType.value && candidates.length === 1 ? candidates[0] : null;
}

export interface MonthlyFact {
  serviceType: ServiceType;
  provider: string;
  avgConsumption: number;
  avgAmount: number;
  lastAmount: number;
  months: number;
}
export interface Recommendation {
  serviceType: ServiceType;
  title: string;
  reason: string;
  estimatedSaving: number;
}
export const MIN_MONTHS_FOR_RECOMMENDATIONS = 2;

/** Agrupa las facturas por servicio y calcula promedios; solo cuenta servicios con historial suficiente. */
export function monthlyFacts(
  invoices: {
    amount: number;
    consumption: number;
    period: string;
    service?: { type: ServiceType; provider: string; id: number };
  }[],
): MonthlyFact[] {
  const groups = new Map<number, typeof invoices>();
  for (const i of invoices)
    if (i.service)
      groups.set(i.service.id, [...(groups.get(i.service.id) ?? []), i]);
  const facts: MonthlyFact[] = [];
  for (const list of groups.values()) {
    if (list.length < MIN_MONTHS_FOR_RECOMMENDATIONS) continue;
    const sorted = [...list].sort((a, b) => a.period.localeCompare(b.period));
    const avg = (f: (x: (typeof list)[number]) => number) =>
      Math.round(list.reduce((s, x) => s + f(x), 0) / list.length);
    facts.push({
      serviceType: sorted[0].service!.type,
      provider: sorted[0].service!.provider,
      avgConsumption: avg((x) => x.consumption),
      avgAmount: avg((x) => x.amount),
      lastAmount: sorted.at(-1)!.amount,
      months: list.length,
    });
  }
  return facts;
}

/** Filtra recomendaciones inválidas y limita el ahorro estimado a lo que realmente se paga. */
export function sanitizeRecommendations(
  raw: unknown,
  facts: MonthlyFact[],
): Recommendation[] {
  const list = Array.isArray(
    (raw as { recommendations?: unknown })?.recommendations,
  )
    ? (raw as { recommendations: unknown[] }).recommendations
    : [];
  const out: Recommendation[] = [];
  for (const r of list.slice(0, 5)) {
    const rec = (r ?? {}) as Record<string, unknown>;
    const fact = facts.find((f) => f.serviceType === rec.serviceType);
    if (
      !fact ||
      !isText(rec.title) ||
      typeof rec.reason !== 'string' ||
      rec.reason.trim().length < 10
    )
      continue;
    const saving =
      typeof rec.estimatedSaving === 'number' && rec.estimatedSaving > 0
        ? Math.min(
            Math.round(rec.estimatedSaving),
            Math.round(fact.avgAmount * 0.5),
          )
        : 0;
    out.push({
      serviceType: fact.serviceType,
      title: rec.title.trim(),
      reason: rec.reason.trim().slice(0, 400),
      estimatedSaving: saving,
    });
  }
  return out;
}
