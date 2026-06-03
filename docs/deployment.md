# Despliegue en VPS con Docker y Nginx

Guía para publicar la quiniela en un VPS usando Docker Compose, MongoDB externo y Nginx como reverse proxy.

## Requisitos

- VPS Linux con Docker y Docker Compose plugin.
- Dominio apuntando al VPS.
- Nginx instalado en el host.
- Certificado TLS, recomendado con Certbot.
- MongoDB externo accesible desde el contenedor.

## Variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y cambia todos los valores `change-me-*`.

Variables obligatorias:

- `MONGODB_URI`
- `SESSION_SECRET`
- `BUILD_NODE_MEMORY_MB`

`MONGODB_URI` y `SESSION_SECRET` deben existir cuando el contenedor arranca. Si tu panel las muestra solo como `build args`, muévelas al apartado de variables de entorno/runtime. Como alternativa compatible, Nuxt también puede leer `NUXT_MONGODB_URI` y `NUXT_SESSION_SECRET`.

Genera un secreto de sesión:

```bash
openssl rand -hex 32
```

En producción `NODE_ENV=production` activa cookies `secure`, por lo que debes servir la app sobre HTTPS detrás de Nginx.

`BUILD_NODE_MEMORY_MB` controla la memoria disponible para el build de Nuxt dentro de Docker. El valor recomendado es `4096`; si tu VPS o Docker Desktop tiene menos memoria disponible, sube el límite de memoria del entorno Docker antes de ejecutar `docker compose build`.

`MONGODB_URI` debe apuntar a una base externa. No uses `localhost` salvo que realmente Mongo esté dentro del mismo contenedor, porque desde Docker `localhost` es la app.

## Build y arranque

```bash
docker compose build
docker compose up -d
```

Ver logs:

```bash
docker compose logs -f app
```

Estado de contenedores:

```bash
docker compose ps
```

Healthcheck público:

```bash
curl http://127.0.0.1:3000/api/health
```

## Primer admin y datos

Antes del despliegue final, crea el administrador inicial desde el entorno de mantenimiento/desarrollo con acceso a la misma base:

```bash
npm run seed:dev
```

En EasyPanel o despliegues donde no ejecutes scripts dentro del servidor, puedes activar temporalmente:

```env
SEED_ADMIN_ENABLED=true
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD="cambia-esta-password"
```

Después del primer arranque, cambia `SEED_ADMIN_ENABLED=false` y redeploya.

Después carga el calendario:

```bash
npm run fetch:worldcup
npm run import:worldcup data/worldcup-2026.json
```

En producción, una vez que ya tengas admin, también puedes entrar a `/admin/operations` y usar el botón **Cargar datos del Mundial** para importar `data/worldcup-2026.json`.

## Nginx reverse proxy

Ejemplo de bloque Nginx:

```nginx
server {
  listen 80;
  server_name quiniela.example.com;

  location / {
    return 301 https://$host$request_uri;
  }
}

server {
  listen 443 ssl http2;
  server_name quiniela.example.com;

  ssl_certificate /etc/letsencrypt/live/quiniela.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/quiniela.example.com/privkey.pem;

  client_max_body_size 10m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Después:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Backups

Crear backup:

```bash
npm run backup:mongo
```

O directamente:

```bash
scripts/mongo-backup.sh
```

El archivo se guarda en `./backups/worldcup-YYYYMMDD-HHMMSS.archive.gz`.

## Restore

Restaurar un backup borra primero la base configurada en `MONGO_DATABASE`.

```bash
npm run restore:mongo backups/worldcup-YYYYMMDD-HHMMSS.archive.gz
```

El script pide escribir `RESTORE` antes de ejecutar.

## Validaciones de producción

Antes de publicar:

```bash
npm run lint
npm run typecheck
npm test
npm run build
docker compose build
docker compose up -d
curl http://127.0.0.1:3000/api/health
```

## Logs

El compose usa el driver `json-file` con rotación:

- `max-size: 10m`
- `max-file: 5`

Para inspeccionar:

```bash
docker compose logs --tail=200 app
```
