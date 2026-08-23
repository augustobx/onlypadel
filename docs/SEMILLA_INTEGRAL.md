# Semilla integral de pruebas

La semilla agrega datos identificados con el prefijo `seed-qa-`. No elimina canchas, usuarios, reservas ni torneos reales.

## Ejecutar o regenerar

```powershell
npm run seed:integral
```

Puede ejecutarse varias veces: primero reemplaza únicamente sus propios datos y luego recrea los escenarios con fechas relativas al día actual de Buenos Aires.

## Accesos de jugadores

- Usuario activo: DNI `45000001`
- Usuario suspendido: DNI `45000020`
- Contraseña para ambos: `Prueba123!`

Los demás usuarios usan DNI consecutivos desde `45000001` hasta `45000020` y la misma contraseña.

## Datos incluidos

- 3 canchas activas con horarios de 08:00 a 23:00 todos los días.
- 20 jugadores: 19 activos y 1 suspendido.
- Reservas confirmadas, pendiente, cancelada, pasada y ocurrencia de turno fijo.
- 3 abonos fijos: 2 activos y 1 inactivo.
- 3 bloqueos: mantenimiento, escuela y evento privado.
- Torneo en borrador no publicado.
- Torneo publicado con inscripciones abiertas y parejas pagas/impagas.
- Torneo eliminatorio en curso con partidos programados, en vivo y finalizados.
- Torneo por zonas en curso con posiciones y fixture.
- Torneo finalizado con campeón y resultados completos.
- 3 categorías de ranking (dos publicadas y una oculta) con usuarios registrados y participantes externos.

La reserva pendiente respeta la caducidad normal del sistema. Para volver a probar ese estado después de su vencimiento, basta con ejecutar nuevamente la semilla.
