# BarraStock — Infraestructura de Licenciamiento (Backend + Web + Conexión con la app)

## Estructura de carpetas/proyectos (IMPORTANTE — leer antes de ejecutar cualquier prompt)

Este bloque involucra **dos proyectos completamente separados**, además del proyecto ya existente de la app de escritorio. No deben mezclarse en la misma carpeta ni repositorio:

```
proyectos/
├── barrastock/              ← YA EXISTE. La app de escritorio (Electron + React + Prisma)
│   ├── docs/
│   ├── prisma/
│   ├── electron/
│   ├── src/
│   └── ...
│
├── barrastock-web/          ← NUEVO. Landing page de venta (Next.js, deploy en Vercel)
│   ├── app/
│   ├── components/
│   ├── public/
│   └── ...
│
└── barrastock-licencias/    ← NUEVO. Código fuente de las Supabase Edge Functions
    └── supabase/
        └── functions/
            ├── webhook-mercadopago/
            ├── activar-licencia/
            └── chequear-licencia/
```

- **`barrastock/`**: sin cambios de estructura, es el proyecto ya en desarrollo. Solo la Parte 3 de este documento lo modifica (para conectar contra el backend real).
- **`barrastock-web/`**: proyecto Next.js nuevo e independiente. Al pedirle esto a Antigravity, aclarar explícitamente que es un proyecto aparte, con su propia carpeta fuera de `barrastock/` — no debe crear archivos de Next.js dentro del proyecto de Electron.
- **`barrastock-licencias/`**: las Edge Functions viven en la nube (Supabase), pero su código fuente conviene versionarlo en una carpeta propia en tu máquina para poder editarlas desde el editor y deployarlas con el CLI de Supabase.

Con esta separación clara, pasamos al plan de desarrollo en 3 partes:

1. **Backend en Supabase** (`barrastock-licencias/`) — tablas, función de webhook de Mercado Pago, función de validación/activación, función de chequeo de renovación.
2. **Landing page** (`barrastock-web/`) — página simple de venta con checkout de Mercado Pago.
3. **Conexión de la app BarraStock** (`barrastock/`) — reemplazar el mock de la Fase 9 por las llamadas reales a Supabase.

---

# PARTE 1 — Backend en Supabase

## PROMPT — Antigravity (o directamente en Supabase si preferís hacerlo manual) | BarraStock | Backend de Licencias

### CONTEXTO
**Carpeta de trabajo: `barrastock-licencias/`** (proyecto nuevo e independiente, fuera de la carpeta `barrastock/` de la app de escritorio — no crear ni modificar archivos dentro de `barrastock/` en esta tarea).

Ya existe un proyecto de Supabase para licencias. El flujo de negocio ya está definido en `docs/PRD-BarraStock-v2.md` sección 6 (ese documento vive en `barrastock/docs/`, se puede leer como referencia aunque el código de esta tarea no vaya ahí): pago en la web → webhook confirma → se genera/actualiza la licencia → activación inicial con código único → renovaciones silenciosas sin código.

### TABLAS A CREAR (SQL / Supabase)

```sql
create table clientes (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nombre text,
  creado_en timestamptz default now()
);

create table licencias (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) not null,
  codigo_activacion text unique, -- solo se usa una vez, en la activación inicial
  codigo_usado boolean default false,
  fecha_inicio timestamptz,
  fecha_vencimiento timestamptz,
  estado text default 'pendiente', -- pendiente | activa | vencida | gracia | bloqueada
  creado_en timestamptz default now(),
  actualizado_en timestamptz default now()
);

create table pagos (
  id uuid primary key default gen_random_uuid(),
  licencia_id uuid references licencias(id) not null,
  mp_payment_id text unique, -- id de pago de Mercado Pago, evita procesar el mismo pago dos veces
  monto numeric not null,
  periodo_meses int not null, -- ej: 3
  fecha timestamptz default now(),
  estado text -- approved | rejected | pending, según lo que informe MP
);
```

### EDGE FUNCTION 1 — `webhook-mercadopago`
Recibe la notificación de Mercado Pago cuando se aprueba un pago.

**Lógica:**
1. Validar que la notificación viene realmente de Mercado Pago (usar la validación de firma que provee su SDK — no confiar en el payload sin verificar).
2. Consultar el detalle del pago contra la API de Mercado Pago usando el `payment_id` recibido (nunca confiar solo en lo que manda el webhook, siempre confirmar contra la API).
3. Verificar que ese `mp_payment_id` no fue procesado antes (evitar duplicados si MP reintenta el webhook).
4. Extraer del pago: email del comprador, monto, periodo comprado (esto depende de cómo se arme el checkout en la Parte 2 — el periodo debe viajar como metadata del pago).
5. Buscar o crear el `cliente` por email.
6. Buscar si el cliente ya tiene una `licencia`:
   - Si es la primera compra: crear una `licencia` nueva con `codigo_activacion` generado (ej. un código corto tipo `A1B2-C3D4`, no un UUID largo — más práctico para tipear a mano en la app), `estado: pendiente`, sin fecha de inicio todavía (se define recién cuando se active en la app).
   - Si ya tenía una licencia activa/vencida: **extender** `fecha_vencimiento` sumando el periodo pagado a partir de la fecha de vencimiento actual (o desde hoy si ya estaba vencida hace rato — definir con una regla simple: si `fecha_vencimiento` ya pasó, el nuevo periodo cuenta desde hoy; si todavía no venció, se suma a partir de esa fecha, para no "perder" días ya pagados).
7. Registrar el pago en la tabla `pagos`.
8. Disparar el mail correspondiente (ver más abajo, envío con Resend).

### EDGE FUNCTION 2 — `activar-licencia`
La app de escritorio la llama en la pantalla de activación inicial.

**Recibe:** email + código de activación.
**Lógica:**
1. Buscar la `licencia` por `codigo_activacion` y `cliente.email` coincidentes.
2. Si no existe o el código ya fue usado (`codigo_usado: true`): devolver error claro.
3. Si es válido: marcar `codigo_usado: true`, `estado: activa`, `fecha_inicio: ahora` (si no estaba seteada), devolver a la app la `fecha_vencimiento` correspondiente.

### EDGE FUNCTION 3 — `chequear-licencia`
La app la llama periódicamente (según la lógica ya implementada en Fase 9) para renovación silenciosa.

**Recibe:** email del cliente (no requiere código, ya que es post-activación).
**Lógica:**
1. Buscar la licencia activa de ese cliente.
2. Devolver el `estado` y `fecha_vencimiento` actual — la app compara esto contra su valor local y actualiza si cambió (esto ya está implementado del lado de la app en Fase 9, esta función solo necesita responder el dato correcto).

### ENVÍO DE MAIL (Resend)
Integrar Resend en la Edge Function del webhook (paso 8 de arriba). Mandar un mail al comprador con:
- Si es primera compra: el código de activación + instrucciones + link de descarga del instalador.
- Si es una renovación: confirmación de que la licencia se extendió, con la nueva fecha de vencimiento (sin código, ya que la renovación es silenciosa).

Usar una plantilla de mail simple en HTML, clara, con el nombre "BarraStock".

### VERIFICACIÓN OBLIGATORIA
1. Simular un pago de prueba en modo sandbox de Mercado Pago y confirmar que el webhook crea correctamente cliente + licencia + pago, y dispara el mail con el código.
2. Probar `activar-licencia` con un código válido y confirmar que responde bien y marca el código como usado.
3. Probar `activar-licencia` con el mismo código una segunda vez y confirmar que lo rechaza (código ya usado).
4. Simular una renovación (segundo pago del mismo cliente) y confirmar que `fecha_vencimiento` se extiende correctamente sin generar un código nuevo, y que el mail de renovación es distinto al de activación inicial.

### SCOPE LOCKS
- ❌ NO confiar en datos del webhook sin verificarlos contra la API real de Mercado Pago.
- ❌ NO generar códigos de activación reutilizables — un código sirve una sola vez.
- ❌ NO dar la tarea por terminada sin probar el flujo completo en modo sandbox/prueba de Mercado Pago.

---

# PARTE 2 — Landing Page

## PROMPT — Antigravity | BarraStock | Landing page de venta

### CONTEXTO
**Carpeta de trabajo: `barrastock-web/` (proyecto Next.js nuevo e independiente, fuera de `barrastock/` — no mezclar con la app de escritorio).**

Página simple (una sola landing, sin cuentas de usuario ni panel de cliente) para vender BarraStock. Stack sugerido: Next.js + Vercel (consistente con el resto de tus proyectos), aunque si preferís algo más simple (HTML estático) también es válido para esta primera versión.

### CONTENIDO DE LA LANDING
- Presentación breve del producto (qué es BarraStock, para quién es, diferencial del motor de recetas).
- Precio y periodo (ej. "$X cada 3 meses").
- Botón de pago con **Mercado Pago Checkout Pro**, que:
  - Al crear la preferencia de pago, incluya como metadata el email ingresado por el comprador y el periodo comprado (esto es lo que la Edge Function del webhook va a leer).
  - Redirija a Mercado Pago para completar el pago.
- Página de "gracias por tu compra" post-pago, indicando que el código de activación le llega por mail en los próximos minutos.
- Sección simple de instrucciones: cómo descargar el instalador y activar la licencia por primera vez.
- Link de descarga del instalador `.exe` (alojado donde se decida — puede ser el mismo GitHub Releases que ya se usa para las actualizaciones, Fase 10).

### VERIFICACIÓN OBLIGATORIA
1. Completar un pago de prueba en sandbox desde la landing y confirmar que la preferencia se crea con el email y periodo correctos como metadata.
2. Confirmar que después del pago de prueba, llega el mail generado por la Parte 1 con el código correspondiente.

### SCOPE LOCKS
- ❌ NO implementar login ni panel de cliente — es una landing simple, sin cuentas.
- ❌ NO implementar múltiples planes/precios en esta primera versión — un solo precio y periodo por ahora.

---

# PARTE 3 — Conectar la app BarraStock con el backend real

## PROMPT — Antigravity | BarraStock | Conectar licenciamiento real (reemplazar mock de Fase 9)

### CONTEXTO
**Carpeta de trabajo: `barrastock/` (el proyecto original de la app de escritorio — esta es la única de las 3 partes que sí toca esa carpeta).**

En la Fase 9 se implementó la lógica de activación/renovación/modo gracia con Supabase **mockeado** (dejado como TODO explícito, según lo definido en ese momento). Ahora que el backend real de la Parte 1 ya existe (en el proyecto separado `barrastock-licencias/`), hay que conectar la app contra las Edge Functions reales.

### OBJETIVO
1. Reemplazar la llamada mockeada de la pantalla de activación inicial para que llame a la Edge Function `activar-licencia` real, con la URL y credenciales del proyecto de Supabase ya existente.
2. Reemplazar la llamada mockeada del chequeo periódico para que llame a `chequear-licencia` real.
3. Mantener toda la lógica ya implementada de modo gracia, bloqueo suave, y detección de manipulación de fecha del sistema — no se toca, solo se cambia el origen de los datos (de mock a real).
4. Manejar correctamente los errores de red reales (timeout, sin conexión, error del servidor) reutilizando el mismo comportamiento ya definido: si falla la consulta, no tocar el estado local, seguir con el valor que ya tenía.

### VERIFICACIÓN OBLIGATORIA
1. Activar la app con un código real generado por un pago de prueba en sandbox (de punta a punta: landing → pago → mail → activación en la app).
2. Confirmar que la app queda funcional offline después de la activación.
3. Simular una renovación (nuevo pago de prueba del mismo cliente) y confirmar que la app, en su próximo chequeo con conexión, sincroniza sola la nueva fecha sin pedir ningún código.

### SCOPE LOCKS
- ❌ NO modificar la lógica de negocio de licenciamiento ya implementada en Fase 9 (modo gracia, bloqueo, casos borde) — solo se conecta a datos reales en vez de mockeados.
- ❌ NO dar la tarea por terminada sin probar el flujo end-to-end completo al menos una vez.

---

# Orden recomendado de ejecución

```
1. Parte 1 (Supabase backend) — es la base, todo lo demás depende de esto
2. Parte 2 (Landing page) — se puede hacer en paralelo con la 1, pero probarla recién cuando la 1 esté lista
3. Parte 3 (Conectar la app) — al final, cuando 1 y 2 ya están probadas de forma independiente
```

**Nota importante:** todo esto debe probarse primero en **modo sandbox/prueba de Mercado Pago** antes de pasar a credenciales de producción — no uses la cuenta real de cobro hasta haber validado el flujo completo con pagos simulados.
