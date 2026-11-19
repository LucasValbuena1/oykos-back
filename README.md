# Oykos API · Ciclo 2

Backend de **Oykos**, la aplicación para gestionar los servicios públicos, facturas,
vehículos e impuestos de un hogar. ISIS3710 · Programación con Tecnologías Web · Uniandes.

- **NestJS 12** con TypeScript, organizado en módulos (controlador · servicio · entidades · DTOs)
- **PostgreSQL 16** con **TypeORM**; el esquema está en el repo `oykos-db` (`db/init.sql`)
- **Seguridad** con `@nestjs/authentication` y `@nestjs/authorization` (sin Passport)
- **Swagger** en `/docs` · **Vitest** con cobertura · **Postman** con pruebas · **Docker**
- **IA**: lectura de recibos y recomendaciones de ahorro con Claude (Anthropic)

---

## 1. Cómo ejecutarlo con Docker

Requisito: Docker Desktop. Los dos repos deben estar clonados uno al lado del otro.

```bash
# 1. Base de datos (crea las tablas, los datos de prueba y la red oykos_net)
cd oykos-db
docker compose up -d

# 2. API
cd ../oykos-back
cp .env.example .env
# Edita .env y pon un JWT_SECRET (y ANTHROPIC_API_KEY si quieres la IA):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
docker compose up -d --build
```

- API: http://localhost:3001
- Swagger: http://localhost:3001/docs
- Salud: http://localhost:3001/health

Dentro de Docker la API se conecta a la base por la red `oykos_net` con el nombre
`oykos_db` (el `docker-compose.yml` ya fija `DB_HOST=oykos_db` y `DB_PORT=5432`).

```bash
docker compose logs -f api      # ver las peticiones
docker compose down             # apagar la API
cd ../oykos-db && docker compose down -v   # borrar la base y volver a los datos iniciales
```

## 2. Cómo ejecutarlo en local (sin Docker para la API)

```bash
cd oykos-db && docker compose up -d          # la base sigue en Docker, puerto 5433
cd ../oykos-back
cp .env.example .env                          # pon JWT_SECRET
npm install
npm run start:dev
```

> Con Node 22 usa npm 11 (`npx npm@11 install`) si `npm install` falla con
> *Cannot read properties of null (reading 'edgesOut')*: es un error de npm 10 con los peers de Nest 12.

### Usuarios de prueba
Contraseña de todos: `Oykos-Demo-2026!`

| Correo            | Rol   |
|-------------------|-------|
| admin@oykos.co    | admin |
| lucas@oykos.co    | user  |
| gabriela@oykos.co | user  |

## 3. Pruebas

```bash
npm test             # pruebas unitarias (Vitest)
npm run test:cov     # con reporte de cobertura (coverage/index.html)
```

**87 pruebas** en 14 archivos. Cobertura de la lógica de negocio:

| Métrica    | Cobertura |
|------------|-----------|
| Líneas     | 100 %     |
| Funciones  | 100 %     |
| Ramas      | 94 %      |

El mínimo del 65 % está configurado como umbral en `vitest.config.ts`: si baja, `npm run test:cov` falla.
Las pruebas usan repositorios falsos (`vi.fn()` + `getRepositoryToken`), así que corren en segundos sin base de datos.

### Postman
`postman/oykos.postman_collection.json` tiene **93 peticiones con 121 aserciones**, en orden:
autenticación, hogares, servicios, alertas, facturas, notificaciones, calendario y reportes,
vehículos e impuestos, incidentes, IA y limpieza. Cada petición valida el código de estado y,
cuando aplica, el contenido (por ejemplo, que la factura de $231.000 disparó la alerta, o que
reusar un refresh token responde *reused*).

También está el ambiente `postman/oykos.postman_environment.json` (`baseUrl` y la contraseña de los usuarios de prueba).

```bash
# Con la base recién creada y la API arriba:
npx newman run postman/oykos.postman_collection.json
```
También se importa en Postman y se ejecuta con el *Runner*. La variable `baseUrl` es `http://localhost:3001`.

---

## 4. Funcionalidades (3 por integrante · 12 en total)

| #  | Integrante | Funcionalidad | Endpoints principales | Reglas de negocio |
|----|-----------|---------------|-----------------------|-------------------|
| 1  | Lucas     | Usuarios y autenticación | `POST /auth/register`, `/auth/token`, `/auth/refresh`, `/auth/logout`, `GET/PATCH /users/me`, `POST /users/me/password` | Correo único; el rol lo pone el servidor; contraseña de 12+ caracteres; mismo 401 si el correo no existe; cambiar la clave cierra todas las sesiones |
| 2  | Lucas     | Servicios públicos | `GET/POST /services`, `GET/PATCH/DELETE /services/:id` | Un hogar no puede tener dos veces el mismo tipo de servicio con la misma empresa (sin importar mayúsculas, tildes o espacios) |
| 3  | Lucas     | Incidentes | `GET/POST /incidents`, `PATCH /incidents/:id`, `PATCH /incidents/:id/status`, `DELETE /incidents/:id` | Código consecutivo `INC-AAAA-NNNN`; estados abierto / en gestión / resuelto / cerrado (cerrado es final, con fecha de solución no futura); corrección de descripción y radicado; un solo incidente abierto por tipo y servicio; bitácora de cada cambio |
| 4  | Felipe    | Hogares | `GET/POST /households`, `GET/PATCH/DELETE /households/:id` | Nombre único por usuario; máximo 10 hogares; estrato 1–6; cada usuario solo ve los suyos (policy) |
| 5  | Felipe    | Reportes | `GET /reports?type=consumo\|gastos\|impuestos` | Total, variación % frente al periodo anterior de la misma duración, desglose por servicio y serie mensual; máximo 24 meses |
| 6  | Felipe    | Impuestos | `GET/POST /taxes`, `PATCH /taxes/:id`, `POST /taxes/:id/pay` | Predial y valorización sobre un hogar, vehicular sobre un vehículo; uno por bien, tipo y año; no se paga por menos; un impuesto pagado no se edita |
| 7  | Gabriela  | Facturas | `GET/POST /invoices`, `GET/PATCH/DELETE /invoices/:id` | Una factura por servicio y periodo; fecha límite no anterior al periodo; corte no posterior a la fecha límite; estado visible (vencida / por vencer) |
| 8  | Gabriela  | Pagos y calendario | `POST /invoices/:id/pay`, `/unpay`, `GET /calendar` | La fecha de pago no puede ser futura ni anterior al periodo; no se paga dos veces; en el calendario una factura pagada aparece en su fecha límite y en el día del pago |
| 9  | Gabriela  | Vehículos y gastos | `GET/POST /vehicles`, `/vehicles/:id/expenses`, `/vehicles/:id/summary` | Placa única con formato colombiano según el tipo (carro ABC123, moto ABC12D); gastos no futuros; resumen por categoría |
| 10 | Alejandro | Alertas y notificaciones | `GET/POST /alert-rules`, `PATCH/DELETE /alert-rules/:id`, `GET /notifications`, `POST /notifications/:id/read` | Una regla por servicio y tipo de umbral; máximo 10 activas por hogar; al crear o editar una factura se generan las notificaciones de los umbrales superados, sin repetirlas |
| 11 | Alejandro | Asistente de ahorro con IA | `GET /ai/recommendations` | Solo con historial suficiente (2+ meses por servicio); la respuesta de Claude se valida y el ahorro se limita al 50 % de lo que se paga |
| 12 | Alejandro | Escáner de recibos con IA | `POST /ai/receipts/scan` | JPG, PNG, WEBP o PDF de máximo 5 MB; cada campo trae su confianza y se descarta si es baja o inválida; sugiere el servicio del hogar al que corresponde |

La documentación completa de cada ruta (parámetros, cuerpos, respuestas y errores) está en Swagger, en `/docs`.

---

## 5. Arquitectura

```
src/
├── main.ts                 helmet, CORS, ValidationPipe, Swagger, límite de 8 MB para recibos
├── app.module.ts           TypeORM, Throttler, AuthenticationModule, AuthorizationModule,
│                           filtro de errores de BD, serializador y middleware de logging
├── common/                 QueryFailedFilter, LoggingMiddleware, transformador NUMERIC, fechas
├── auth/                   AuthController, JwtAuth, almacén de refresh tokens en PostgreSQL
├── users/                  User (con @Exclude en el hash), perfil y cambio de contraseña
├── households/             Hogares + HouseholdPolicy (la regla de acceso de todo el sistema)
├── services/  invoices/  calendar/  vehicles/  taxes/  alerts/  incidents/  reports/  ai/
```

Cada módulo sigue la misma división, como en clase:

- **Controlador**: solo HTTP. Recibe el DTO ya validado, toma el usuario con `@CurrentUser()` y delega.
- **Servicio**: las reglas de negocio. No sabe nada de HTTP; lanza excepciones de Nest (404, 409, 400).
- **Entidades**: el mapeo a las tablas, con relaciones `ManyToOne`/`OneToMany`.
- **DTOs**: uno por operación, con `class-validator` y `@nestjs/swagger`.

Los cálculos que no tocan la base (calendario, reportes, lectura de recibos) están en
archivos `*.logic.ts` como funciones puras: se prueban sin mocks y se reutilizan.

---

## 6. Justificaciones técnicas

**NestJS 12 y ESM.** Es la versión actual del CLI y la que se usa en clase; los paquetes de Nest
son solo ESM, por eso los imports relativos terminan en `.js`. Las relaciones entre entidades usan
`Relation<T>` de TypeORM para evitar el error de importaciones circulares de ESM.

**PostgreSQL + TypeORM, con `synchronize: false`.** Los datos son relacionales (usuario → hogar →
servicio → factura) y necesitan llaves foráneas y `JOIN`. El esquema vive en `init.sql` del repo de
la base: así la estructura está versionada, las restricciones (`UNIQUE`, `CHECK`, `ON DELETE CASCADE`)
las aplica la base aunque el código falle, y la API nunca altera tablas por su cuenta.
`QueryFailedFilter` traduce los errores de PostgreSQL (23505, 23503, 23514, 22P02) a 409 o 400 en vez de 500.

**Montos como `NUMERIC`.** El dinero no se guarda en `float`; un transformador lo convierte a `number` al leer.

**Autenticación con `@nestjs/authentication` (no Passport).** Es el paquete oficial que vimos en clase:
- Contraseñas con **scrypt** (`PasswordHasher`, parámetros mínimos de OWASP) y sal por usuario.
- **Access token JWT de 15 minutos** firmado con `JWT_SECRET` (solo en `.env`, nunca en el código), con `iss` y `aud`.
- **Refresh token de 7 días con rotación** (máximo 30 días por familia). Guardamos solo su hash en
  `refresh_tokens`. `markRefreshTokenUsed` es una única escritura condicional
  (`UPDATE … WHERE used_at IS NULL`), así que si alguien reusa un token robado se detecta y se revoca toda la familia.
- Mismo mensaje y mismo tiempo de respuesta si el correo no existe (no revela qué cuentas hay).
- El guard es global: toda ruta pide token salvo las marcadas con `@Public()`.

**Autorización con `@nestjs/authorization`.** `HouseholdPolicy` concentra la regla de acceso: el admin
pasa siempre (`before`) y los demás solo sobre sus hogares. Como todo cuelga de un hogar, cada servicio
carga el objeto y llama a `authorize()` con esa policy: sin usuario 401, de otro usuario 403, inexistente 404.
Así se evita el BOLA (*Broken Object Level Authorization*, OWASP API1) en todos los endpoints.

**Validación y defensa de la API** (clase de vulnerabilidades):
- `ValidationPipe` con `whitelist` y `forbidNonWhitelisted`: un campo desconocido como `role` responde 400 (asignación masiva).
- `ParseIntPipe` en los ids; DTOs con rangos, formatos y enums.
- `ClassSerializerInterceptor` + `@Exclude()`: el hash nunca sale en una respuesta.
- `helmet` para los headers de seguridad, CORS con lista blanca (`CORS_ORIGINS`).
- `@nestjs/throttler`: 100 peticiones por minuto en general, 5 por minuto en login y registro, 10 en la IA.
- La respuesta de la IA nunca se usa directamente: cada campo se valida y se sanea antes de devolverlo.

**IA con Claude.** El SDK oficial `@anthropic-ai/sdk` con *tool use* forzado, para que la respuesta
siempre tenga la forma esperada. Si falta `ANTHROPIC_API_KEY` la API responde 503 y el resto funciona igual.

**Pruebas con Vitest.** Es lo que genera el CLI de Nest 12 y lo que vimos en clase. Las pruebas unitarias
cubren servicios, policies, el almacén de tokens, el filtro y la lógica pura. La cobertura se mide sobre
esos archivos; los controladores, módulos, DTOs y entidades son declarativos y se prueban con Postman.

**Docker.** Imagen en dos etapas sobre `node:22-alpine` (versión fija): la final solo lleva `dist/` y las
dependencias de producción, y corre como el usuario `node`, no como root. La base está en otro repo y
otro compose; los dos se encuentran por la red `oykos_net`.

---

## 7. Variables de entorno

| Variable            | Descripción                                   | Ejemplo                  |
|---------------------|-----------------------------------------------|--------------------------|
| `PORT`              | Puerto de la API                              | `3001`                   |
| `DB_HOST`           | Host de PostgreSQL                            | `localhost`              |
| `DB_PORT`           | Puerto de PostgreSQL                          | `5433`                   |
| `DB_USER`           | Usuario                                       | `oykos`                  |
| `DB_PASSWORD`       | Contraseña                                    | `oykos123`               |
| `DB_NAME`           | Base de datos                                 | `oykos_db`               |
| `JWT_SECRET`        | Clave para firmar los tokens (obligatoria)    | 64 caracteres hex        |
| `CORS_ORIGINS`      | Orígenes permitidos, separados por coma       | `http://localhost:3000`  |
| `ANTHROPIC_API_KEY` | Opcional, para el escáner y el asistente      |                          |
| `ANTHROPIC_MODEL`   | Opcional                                      | `claude-sonnet-5-5`      |

## 8. Equipo

Lucas Valbuena · Felipe Ardila · Gabriela Campos · Alejandro Guzmán
