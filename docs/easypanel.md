# Despliegue en EasyPanel con MongoDB externo

Esta guía levanta solo la aplicación Nuxt en Docker. MongoDB debe existir como un servicio externo: MongoDB Atlas, un servicio Mongo separado en EasyPanel, o una base en otro servidor.

## Configuración del servicio

En EasyPanel crea una app usando el repositorio del proyecto.

- Tipo: Dockerfile
- Dockerfile: `Dockerfile`
- Puerto interno: `3000`
- Healthcheck path: `/api/health`
- Build arg opcional: `NODE_OPTIONS=--max-old-space-size=2048`

Si el build sigue quedándose corto de memoria, sube el build arg a:

```text
NODE_OPTIONS=--max-old-space-size=4096
```

## Variables

Configura estas variables en EasyPanel:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
NUXT_PUBLIC_APP_NAME="Quiniela Mundial 2026"
SESSION_SECRET="usa-openssl-rand-hex-32"
MONGODB_URI="mongodb://usuario:password@host-mongo:27017/worldcup?authSource=admin"
```

Para MongoDB Atlas usa una URI tipo:

```env
MONGODB_URI="mongodb+srv://usuario:password@cluster.mongodb.net/worldcup?retryWrites=true&w=majority"
```

Importante: dentro de un contenedor `localhost` apunta al propio contenedor de la app, no a MongoDB. Usa el hostname real del servicio externo, el hostname que te dé EasyPanel, o una URI de Atlas.

## Admin inicial

Para crear el primer administrador, agrega temporalmente:

```env
SEED_ADMIN_ENABLED=true
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD="cambia-esta-password"
```

Arranca el servicio y revisa logs hasta ver:

```text
Administrador inicial creado o actualizado
```

Después cambia `SEED_ADMIN_ENABLED=false` y redeploya. Mantén `SEED_ADMIN_PASSWORD` fuera de logs, capturas y documentación pública.

## Carga de datos

Cuando entres como admin, ve a `/admin/operations` y usa **Cargar datos del Mundial**. El contenedor incluye `data/worldcup-2026.json`.

## Backup y restore

Los scripts trabajan contra `MONGODB_URI`, no contra un contenedor local de Mongo.

Backup:

```bash
pnpm backup:mongo
```

Restore:

```bash
pnpm restore:mongo backups/worldcup-YYYYMMDD-HHMMSS.archive.gz
```

Los scripts usan una imagen temporal `mongo:7` para ejecutar `mongodump` y `mongorestore`.

## Validación

Después del deploy:

```bash
curl https://tu-dominio.com/api/health
```

Debe responder con `ok: true`. Si responde `unhealthy`, revisa `MONGODB_URI`, credenciales, allowlist de IPs en MongoDB Atlas y conectividad entre EasyPanel y Mongo.
