# PROMPT — Antigravity | BarraStock | Feature: Recuperar licencia en una PC nueva (por email + código de confirmación)

## CONTEXTO

**Carpetas involucradas:**
- `barrastock-licencias/`: nueva Edge Function para recuperación.
- `barrastock/`: nueva opción en la pantalla de activación.

Hoy, el código de activación (`codigo_activacion`) es de un solo uso — sirve únicamente para la primera activación. Si un cliente necesita reinstalar BarraStock en una PC nueva (la suya se rompió, la formateó, etc.), no tiene forma de volver a activar su licencia ya existente sin ese código original.

## OBJETIVO

Agregar un flujo de **"¿Ya activaste antes? Recuperar mi licencia"** en la pantalla de activación de la app, que permita reactivar sin el código original, usando el email + un código de confirmación de un solo uso y corta duración (no el código de activación original, uno nuevo, generado en el momento).

---

## PARTE A — Backend (`barrastock-licencias/`)

### Nueva tabla (o campos agregados a `licencias`)
Agregar una forma de guardar códigos de confirmación temporales. Puede ser una tabla nueva:

```sql
create table codigos_confirmacion (
  id uuid primary key default gen_random_uuid(),
  licencia_id uuid references licencias(id) not null,
  codigo text not null, -- ej: 6 dígitos numéricos
  usado boolean default false,
  expira_en timestamptz not null, -- ej: ahora + 10 minutos
  creado_en timestamptz default now()
);
```

### Edge Function 1 — `solicitar-recuperacion`
**Recibe:** email del cliente.
**Lógica:**
1. Buscar si existe un `cliente` con ese email y una `licencia` asociada con `estado: activa` o `gracia` (no permitir recuperación de licencias `bloqueada` o inexistentes — en esos casos, devolver un mensaje genérico sin confirmar ni negar si el email existe, para no filtrar información de qué emails están registrados).
2. Si existe: generar un código numérico corto (6 dígitos), guardarlo en `codigos_confirmacion` asociado a esa licencia, con `expira_en` = ahora + 10 minutos.
3. Enviar por Resend un mail a ese email con el código, dejando claro que es para reactivar BarraStock en un dispositivo nuevo (para que el cliente entienda de qué se trata si no lo esperaba, y pueda sospechar si no fue él quien lo pidió).
4. Responder siempre con un mensaje genérico de éxito ("Si el email está registrado, te enviamos un código"), tanto si el email existe como si no — para no revelar si un email está o no en la base (buena práctica de seguridad básica).

### Edge Function 2 — `confirmar-recuperacion`
**Recibe:** email + código de 6 dígitos.
**Lógica:**
1. Buscar el código en `codigos_confirmacion` que coincida con ese email (vía la licencia asociada), no esté `usado`, y no haya expirado.
2. Si no es válido (no existe, ya usado, o expirado): devolver error claro ("Código inválido o vencido, pedí uno nuevo").
3. Si es válido: marcar `usado: true`, y devolver los mismos datos que devolvería `activar-licencia` (estado y `fecha_vencimiento` de la licencia), para que la app se active con normalidad en el dispositivo nuevo.
4. **No tocar el `codigo_activacion` original** — sigue existiendo y marcado como usado de la primera vez, esto es un mecanismo totalmente aparte.

---

## PARTE B — App (`barrastock/`)

### Pantalla de activación
- Agregar un link/botón discreto debajo del formulario actual: **"¿Ya activaste BarraStock antes? Recuperar mi licencia"**.
- Al hacer click, mostrar un mini-flujo de 2 pasos dentro de la misma pantalla:
  1. Campo de email → botón "Enviar código". Llama a `solicitar-recuperacion`. Muestra mensaje genérico de confirmación ("Si el email está registrado, te llegará un código en unos minutos").
  2. Campo de código de 6 dígitos → botón "Confirmar". Llama a `confirmar-recuperacion`. Si es válido, activa la app igual que el flujo normal de activación (guarda `licenciaEstado: activa`, `licenciaVence`, etc. en `Configuracion` local).
- Requiere internet, igual que la activación normal — dejar esto claro en el texto de la pantalla.

## VERIFICACIÓN OBLIGATORIA

1. Con una licencia ya activa (email de prueba conocido), usar el flujo de "Recuperar mi licencia" desde una instalación nueva/reseteada de la app.
2. Confirmar que llega el mail con el código de 6 dígitos.
3. Ingresar el código y confirmar que la app se activa correctamente, mostrando el mismo estado (vencimiento, etc.) que tenía la licencia original.
4. Probar con un código incorrecto y confirmar que se rechaza con mensaje claro.
5. Probar con un código correcto pero después de que pasen los 10 minutos de expiración (se puede simular ajustando la expiración en la base para la prueba) y confirmar que también se rechaza.
6. Probar con un email que NO existe en la base y confirmar que el sistema responde con el mismo mensaje genérico que con un email válido (no debe distinguir en la respuesta visible).
7. Confirmar que usar este flujo no afecta ni "gasta" el `codigo_activacion` original de la licencia.

## SCOPE LOCKS

- ❌ NO usar el `codigo_activacion` original para este flujo — es un mecanismo completamente aparte, de código temporal de 6 dígitos.
- ❌ NO revelar en la respuesta de `solicitar-recuperacion` si el email existe o no en la base — siempre responder con el mismo mensaje genérico.
- ❌ NO permitir recuperación para licencias `bloqueada` (vencidas sin renovar) — en ese caso, el cliente debe renovar primero (pagar) antes de poder reactivar en cualquier dispositivo.
- ❌ NO dar la tarea por terminada sin probar el flujo completo end-to-end (puntos 1 a 7).
