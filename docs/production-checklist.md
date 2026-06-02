# Checklist de producción

## Variables

- `MONGODB_URI` apunta a una base con backups automáticos.
- `SESSION_SECRET` tiene al menos 32 caracteres aleatorios.
- `NUXT_PUBLIC_APP_NAME` contiene el nombre público.
- `SEED_ADMIN_ENABLED=false` después de crear el primer administrador.
- `SEED_ADMIN_PASSWORD` no queda visible en capturas, logs ni documentación.

## Seguridad

- HTTPS obligatorio.
- Cookies `secure` activas por `NODE_ENV=production`.
- Rate limit activo en login y endpoints mutativos admin.
- Validación de origen activa para métodos mutativos.
- No se expone `passwordHash` en serializers ni endpoints.

## MongoDB

- Ejecutar la app una vez con permisos de creación de índices.
- Verificar índices únicos de usuarios, equipos, partidos, predicciones y slots.
- Configurar backups diarios.
- Probar restauración en un ambiente aislado.

## Operación

- Importar calendario primero en modo preview.
- Revisar `/admin/operations` antes de abrir pronósticos.
- Ejecutar recálculo global después de importar calendario oficial.
- Revisar `/admin/audit` después de cambios operativos manuales.

## Observabilidad

- Capturar stdout/stderr como logs estructurados.
- Alertar por errores 5xx.
- Alertar por fallas recurrentes en login.
- Monitorear latencia de endpoints admin de recálculo.
