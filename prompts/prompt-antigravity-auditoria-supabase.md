# PROMPT — Antigravity | BarraStock | Auditoría y completado del backend de licencias en Supabase

## CONTEXTO

**Carpeta de trabajo: `barrastock-licencias/`** (proyecto separado, fuera de `barrastock/`).

Ya existe trabajo previo hecho en el proyecto de Supabase de licencias — no es un proyecto desde cero. Antes de crear nada nuevo, esta tarea es primero de **auditoría**: revisar qué existe realmente hoy y compararlo contra lo que se necesita, para completar solo lo que falta sin duplicar ni romper lo que ya funciona.

## PASO 1 — Auditoría (hacer esto primero, sin escribir código todavía)

Revisar el proyecto de Supabase actual y reportar en texto, antes de tocar nada:

1. **Tablas existentes**: ¿existen `clientes`, `licencias`, `pagos` (o nombres equivalentes)? Listar su estructura real (columnas, tipos) tal como están hoy.
2. **Edge Functions existentes**: ¿hay alguna función ya creada relacionada a webhook de Mercado Pago, activación de licencia, o chequeo de vencimiento? Listar cuáles existen y qué hace cada una actualmente (leer el código real, no asumir por el nombre).
3. **Integraciones ya configuradas**: ¿hay credenciales de Mercado Pago y/o Resend ya cargadas como variables de entorno/secrets en el proyecto de Supabase?
4. Reportar todo esto de forma clara antes de pasar al Paso 2.

## PASO 2 — Comparar contra el diseño objetivo

El diseño completo esperado es el siguiente (ya definido en el plan general del proyecto):

**Tablas:**
```sql
clientes (id, email, nombre, creado_en)
licencias (id, cliente_id, codigo_activacion, codigo_usado, fecha_inicio, fecha_vencimiento, estado, creado_en, actualizado_en)
pagos (id, licencia_id, mp_payment_id, monto, periodo_meses, fecha, estado)
```

**Edge Functions:**
- `webhook-mercadopago`: recibe notificación de pago aprobado, valida contra la API real de MP (no confía en el payload sin verificar), evita procesar el mismo `mp_payment_id` dos veces, crea/actualiza cliente y licencia (genera código de activación corto y único si es primera compra; extiende `fecha_vencimiento` si es renovación), registra el pago, envía mail con Resend (código de activación si es primera vez, confirmación de renovación si no).
- `activar-licencia`: recibe email + código, valida que el código exista, pertenezca a ese email, y no haya sido usado; si es válido marca `codigo_usado: true`, `estado: activa`, `fecha_inicio`, y devuelve `fecha_vencimiento`.
- `chequear-licencia`: recibe email, devuelve `estado` y `fecha_vencimiento` actuales de su licencia.

## PASO 3 — Completar solo lo que falta

Basándote en la comparación del Paso 2:

- Si una tabla ya existe pero le faltan columnas del diseño objetivo: agregar las columnas faltantes con una migración, sin borrar ni tocar las columnas/datos que ya tenía.
- Si una tabla no existe: crearla según el diseño.
- Si una Edge Function ya existe pero le falta lógica (ej. no valida el pago contra la API real, no evita duplicados, no envía mail): completarla, sin reescribir de cero lo que ya funciona si no es necesario.
- Si una Edge Function no existe: crearla según el diseño.
- Si encontrás algo que ya está hecho de una forma **distinta pero funcionalmente válida** a lo descripto arriba (ej. otros nombres de columnas, otra forma de generar el código de activación): **no lo reescribas para que coincida exactamente con este documento** — mantené lo que ya funciona y avisá la diferencia, para decidir juntos si conviene unificar o dejarlo así.

## VERIFICACIÓN OBLIGATORIA (no dar la tarea por terminada sin esto)

1. Simular un pago de prueba en modo sandbox de Mercado Pago contra `webhook-mercadopago` y confirmar que crea/actualiza correctamente cliente, licencia y pago en las tablas reales del proyecto.
2. Confirmar que llega el mail (vía Resend) con el código de activación.
3. Probar `activar-licencia` con ese código y confirmar que responde correctamente y lo marca como usado.
4. Probar `activar-licencia` de nuevo con el mismo código y confirmar que lo rechaza.
5. Simular una segunda compra del mismo cliente (renovación) y confirmar que `fecha_vencimiento` se extiende sin generar un código nuevo, y que el mail de esta segunda vez es de renovación, no de activación.
6. Probar `chequear-licencia` y confirmar que devuelve el estado y fecha reales y actualizados.

## SCOPE LOCKS

- ❌ NO borrar ni sobreescribir tablas, funciones o datos existentes sin reportarlo antes y confirmar que corresponde.
- ❌ NO recrear desde cero algo que ya funciona correctamente solo para que coincida estéticamente con el diseño de este documento.
- ❌ NO dar la tarea por terminada sin completar el Paso 1 (reporte de auditoría) de forma explícita al principio de la respuesta, y sin correr los 6 puntos de verificación al final.
- ⚠️ Si algo del Paso 1 no se puede determinar con certeza (ej. no hay forma de confirmar si una función ya fue probada con un pago real), decirlo explícitamente en vez de asumir que funciona.
