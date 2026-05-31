# Despliegue en VPS con Docker y Nginx

Guía para publicar la quiniela en un VPS usando Docker Compose, MongoDB y Nginx como reverse proxy.

## Requisitos

- VPS Linux con Docker y Docker Compose plugin.
- Dominio apuntando al VPS.
- Nginx instalado en el host.
- Certificado TLS, recomendado con Certbot.

## Variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y cambia todos los valores `change-me-*`.

Variables obligatorias:

- `MONGODB_URI`
- `SESSION_SECRET`
- `MONGO_DATABASE`
- `MONGO_ROOT_USERNAME`
- `MONGO_ROOT_PASSWORD`
- `MONGO_APP_USERNAME`
- `MONGO_APP_PASSWORD`

Genera un secreto de sesión:

```bash
openssl rand -hex 32
```

En producción `NODE_ENV=production` activa cookies `secure`, por lo que debes servir la app sobre HTTPS detrás de Nginx.

## Build y arranque

```bash
docker compose build
docker compose up -d
```

Ver logs:

```bash
docker compose logs -f app
docker compose logs -f mongo
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
pnpm seed:dev
```

Después carga el calendario:

```bash
pnpm fetch:worldcup
pnpm import:worldcup data/worldcup-2026.json
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
pnpm backup:mongo
```

O directamente:

```bash
scripts/mongo-backup.sh
```

El archivo se guarda en `./backups/worldcup-YYYYMMDD-HHMMSS.archive.gz`.

## Restore

Restaurar un backup borra primero la base configurada en `MONGO_DATABASE`.

```bash
pnpm restore:mongo backups/worldcup-YYYYMMDD-HHMMSS.archive.gz
```

El script pide escribir `RESTORE` antes de ejecutar.

## Validaciones de producción

Antes de publicar:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
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
docker compose logs --tail=200 mongo
```
