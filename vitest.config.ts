import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      // La cobertura se mide sobre la lógica de negocio: servicios, reglas puras,
      // policies, el almacén de refresh tokens y lo común (filtros, middleware).
      include: [
        'src/**/*.service.ts',
        'src/**/*.logic.ts',
        'src/**/*.policy.ts',
        'src/**/*.store.ts',
        'src/auth/jwt.auth.ts',
        'src/common/**/*.ts',
        'src/**/*.module.ts',
      ],
      exclude: ['src/app.module.ts', 'src/**/*.module.ts'],
      thresholds: { lines: 65, functions: 65, branches: 65, statements: 65 },
    },
  },
});
