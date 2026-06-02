# Quiniela Mundial 2026

Plataforma Nuxt 4 para administrar una quiniela del Mundial FIFA 2026 con autenticación segura, pronósticos, resultados, ranking general, tablas de grupos, mejores terceros y llaves eliminatorias.

## Stack

- Nuxt 4
- Nuxt UI
- TypeScript
- MongoDB
- Mongoose
- Zod
- bcrypt
- Cookies httpOnly
- npm

## Setup

```bash
npm install
cp .env.example .env
```

Configura `MONGODB_URI` y `SESSION_SECRET` antes de iniciar.

## Desarrollo

```bash
npm run dev
```

## Seed de desarrollo

El seed crea un administrador, equipos y partidos mínimos para probar dashboards.

```bash
npm run seed:dev
```

Credenciales por defecto:

- Usuario: `admin`
- Password: `Admin12345!`

Puedes cambiarlas con:

```bash
SEED_ADMIN_USERNAME=admin SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD='Admin12345!' npm run seed:dev
```

## Importar calendario

```bash
npm run import:worldcup calendario.json
```

También existe preview vía endpoint admin:

```http
POST /api/admin/import/worldcup/preview
```

## QA

```bash
npm test
npm run typecheck
npm run lint
```

## Operación

- `/admin/operations`: salud del torneo y recálculo global.
- `/admin/audit`: auditoría de acciones críticas.
- `/admin/results`: captura y edición de resultados.
- `/admin/bracket`: clasificación y llaves.

## Producción

El proyecto incluye Dockerfile, Docker Compose app-only, healthcheck, scripts de backup/restore y guías para Nginx o EasyPanel con MongoDB externo.

Consulta [docs/deployment.md](docs/deployment.md).

Para EasyPanel revisa [docs/easypanel.md](docs/easypanel.md).

Revisa [docs/production-checklist.md](docs/production-checklist.md) antes de publicar.
