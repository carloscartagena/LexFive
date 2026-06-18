# Bloque 2 de mejoras — pasos de configuración

Cinco mejoras nuevas. Dos funcionan con solo fusionar el PR; las otras necesitan
un pasito extra (te lo dejo lo más simple posible).

| # | Mejora | ¿Necesita configurar? |
|---|--------|------------------------|
| 1 | Tamaño de letra (A− / A+) | No, solo fusionar |
| 2 | Gráfico de ingresos por mes | No, solo fusionar |
| 3 | Estado de cuenta del cliente (PDF) | Sí: 1 script SQL |
| 4 | Campanita de notificaciones | Sí: el mismo script SQL + re-desplegar `avisar-actuacion` |
| 5 | Recordatorio de tareas que vencen mañana | Sí: re-desplegar `recordatorios-audiencias` |

## Paso A — Script SQL (para #3 y #4)
En **Supabase → SQL Editor**, pega y ejecuta el contenido de
`db/24_notificaciones_estado_cuenta.sql` (botón **Run**). Es seguro repetirlo.

Esto:
- Crea la tabla `notificaciones` (para la campanita) con sus permisos.
- Permite que cada **cliente** lea los honorarios y pagos de **sus** procesos
  (para su estado de cuenta).

> Si NO corres este script, la campanita simplemente no aparece y el estado de
> cuenta dirá que no hay movimientos. Nada se rompe.

## Paso B — Re-desplegar `avisar-actuacion` (para #4)
Para que, al registrar una actuación, además del correo/push se cree la
**notificación dentro de la app** del cliente:

- Supabase → **Edge Functions → avisar-actuacion → (editar/Deploy)** y vuelve a
  pegar el código actualizado de `supabase/functions/avisar-actuacion/index.ts`
  (cópialo desde GitHub con el botón **Raw**), o por CLI:
  ```bash
  supabase functions deploy avisar-actuacion --project-ref soazmibvesvuwgxeealo
  ```

## Paso C — Re-desplegar `recordatorios-audiencias` (para #5)
Para que el recordatorio diario incluya también las **tareas que vencen mañana**:

- Igual que arriba, vuelve a desplegar `recordatorios-audiencias` con el código
  actualizado (`supabase/functions/recordatorios-audiencias/index.ts`), o:
  ```bash
  supabase functions deploy recordatorios-audiencias --no-verify-jwt --project-ref soazmibvesvuwgxeealo
  ```
  (Usa `--no-verify-jwt` porque a esta la llama el cron, no un usuario.)

## Después
- En el celular, cierra y reabre la app una vez (service worker nuevo).
- Prueba la campanita registrando una actuación en un proceso con cliente.
- Prueba el estado de cuenta entrando como cliente → "Mi estado de cuenta".
