# OnlyPadel — producción

## Dominios

- Plataforma y SuperAdmin: `onlypadel.nanoapps.ar`
- Primer tenant migrado: `pescadores-padel.onlypadel.nanoapps.ar`
- Nuevos tenants: `<slug>.onlypadel.nanoapps.ar`
- Dominios personalizados: se agregan en SuperAdmin y se habilitan después de verificar DNS.

## Cutover seguro

1. Completar `.env` desde `deploy.env.example` con secretos nuevos y los valores históricos de integraciones.
2. Crear un backup lógico verificado del origen y registrar su SHA-256.
3. Restaurar el dump en una base vacía llamada `onlypadel`.
4. Ejecutar `docker compose build` y luego `docker compose up -d`. El job `migrate` detecta el esquema histórico, registra la migración base, aplica la migración SaaS y crea/actualiza el SuperAdmin y los planes. La web no inicia si ese job falla.
5. Verificar `docker compose ps`, logs de `migrate`, `/api/health`, portada, reservas, login de club y `/platform/login`.
6. En Cloudflare, crear `*.onlypadel.nanoapps.ar` apuntando al dedicado en modo **DNS only**; el wildcard proxied de OnlyFood no sirve TLS para un segundo nivel. En Nginx Proxy Manager, enviar `onlypadel.nanoapps.ar`, `*.onlypadel.nanoapps.ar` y los dominios personalizados verificados a `onlypadel-web:3000`, con WebSocket, certificado wildcard por DNS challenge y redirección HTTPS. No modificar el wildcard `*.nanoapps.ar` de OnlyFood.
7. Cambiar DNS únicamente después del smoke test interno. Conservar origen y dump sin cambios hasta cerrar la ventana de rollback.

## Backup y restauración

- Ejecutar `ops/backup.sh` desde el directorio del stack. Genera dump comprimido, valida gzip, crea SHA-256 y retiene 30 días bajo `/srv/backups/onlypadel`.
- Probar periódicamente una restauración en una base aislada y comparar cantidades por tenant de usuarios, canchas, reservas y abonos.
- Rollback: retirar los hosts de OnlyPadel del proxy, volver a apuntar al origen y conservar la base nueva para análisis; no sobrescribir el origen.

## Comprobaciones obligatorias

- No hay puertos públicos para MariaDB ni para la web; sólo la red externa del proxy alcanza `onlypadel-web:3000`.
- Un dominio desconocido no resuelve un tenant y un dominio de club no puede abrir SuperAdmin.
- Sesiones de plataforma, administradores y jugadores son opacas, persistidas, revocables y ligadas al tenant.
- Toda escritura funcional exige tenant en servidor y módulo habilitado por plan o excepción.
- Los tokens de MercadoPago y WhatsApp son de escritura solamente en la UI y pertenecen al tenant.
