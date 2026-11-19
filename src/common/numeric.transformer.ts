import type { ValueTransformer } from 'typeorm';

/** PostgreSQL devuelve NUMERIC como texto: lo convertimos a number al leer. */
export const numeric: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};
