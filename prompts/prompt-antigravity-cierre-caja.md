# PROMPT — Antigravity | BarraStock | Feature: Apertura/Cierre de Caja + Historial + Exportar PDF

## CONTEXTO

BarraStock no tiene hoy ningún concepto de "sesión de caja" — las ventas existen sueltas, sin agruparse por turno/jornada. Se necesita poder abrir una caja (con o sin fondo inicial), que las ventas queden asociadas a esa sesión mientras está abierta, y poder cerrarla viendo un resumen. Además, un historial de todos los cierres pasados, con posibilidad de exportar cada uno a PDF.

**La cantidad de cierres por día es libre** — el usuario decide cuándo abre y cuándo cierra, puede ser una vez al día o varias veces (turnos).

---

## CAMBIOS EN EL SCHEMA DE PRISMA

Agregar un nuevo modelo `CajaSesion`:

```prisma
enum EstadoCaja {
  abierta
  cerrada
}

model CajaSesion {
  id              String       @id @default(cuid())
  numero          Int          @unique // correlativo legible, igual criterio que Nro Venta (#1, #2...)

  fondoInicial    Float        @default(0)
  fechaApertura   DateTime     @default(now())

  fechaCierre     DateTime?
  totalEfectivo   Float?       // suma de ventas activas en efectivo durante la sesión
  totalTransferencia Float?    // suma de ventas activas por transferencia durante la sesión
  totalVentas     Float?       // totalEfectivo + totalTransferencia
  totalEsperadoCaja Float?     // fondoInicial + totalEfectivo (la transferencia no está físicamente en la caja)
  cantidadVentas  Int?
  cantidadAnuladas Int?

  estado          EstadoCaja   @default(abierta)

  ventas          Venta[]
}
```

Y en el modelo `Venta` ya existente, agregar la relación:

```prisma
model Venta {
  // ...campos existentes...
  cajaSesionId  String?
  cajaSesion    CajaSesion?  @relation(fields: [cajaSesionId], references: [id])
}
```

Generar la migración correspondiente. Las ventas ya existentes en la base (previas a este cambio) quedan con `cajaSesionId: null` — no requieren backfill, se consideran "fuera de sesión" y no rompen nada.

---

## LÓGICA DE NEGOCIO

### Apertura de caja
- Pantalla/acción simple: botón "Abrir caja" (visible solo si no hay ninguna caja con `estado: abierta` en este momento — no se puede abrir una segunda caja mientras otra sigue abierta).
- Pide un campo opcional "Fondo inicial" (numérico, default $0 si se deja vacío).
- Al confirmar, crea un `CajaSesion` nuevo con `estado: abierta`, `fechaApertura: ahora`, `numero` correlativo.

### Durante la sesión abierta
- Toda venta nueva que se registre en el POS debe asociarse automáticamente a la `CajaSesion` con `estado: abierta` (buscarla al momento de crear la venta).
- Si no hay ninguna caja abierta al intentar vender: decidir cómo se maneja este caso — **preguntar antes de implementar**: ¿se debe bloquear la venta hasta que se abra una caja, o se permite vender igual dejando la venta sin sesión asociada? (No asumas una respuesta, consultar explícitamente este punto antes de avanzar si no está claro en el código actual cómo se espera que se comporte el POS respecto a esto.)

### Cierre de caja
- Botón "Cerrar caja" (visible solo si hay una caja abierta).
- Al confirmar el cierre:
  - Calcular `totalEfectivo` = suma de `total` de todas las `Venta` de esa sesión con `medioPago: efectivo` y `estado: activa` (las anuladas no suman).
  - Calcular `totalTransferencia` = ídem con `medioPago: transferencia`.
  - `totalVentas` = `totalEfectivo + totalTransferencia`.
  - `totalEsperadoCaja` = `fondoInicial + totalEfectivo` (la transferencia no es dinero físico en la caja).
  - `cantidadVentas` = cantidad de ventas activas de la sesión.
  - `cantidadAnuladas` = cantidad de ventas anuladas de la sesión.
  - Guardar `fechaCierre: ahora`, `estado: cerrada`.
- Mostrar un resumen en pantalla al momento de cerrar, con todos estos totales antes de confirmar definitivamente.

---

## PANTALLAS

**Agregar DOS entradas nuevas en el menú lateral, separadas entre sí:**

- **"Caja"** → pantalla de apertura/cierre de la sesión actual (ver punto 1 abajo).
- **"Historial de Cajas"** → listado de todos los cierres pasados con exportación a PDF (ver punto 2 abajo). Esta es una sección propia, no una pestaña escondida dentro de "Caja" — debe poder accederse directamente desde el menú en cualquier momento, incluso sin tener una caja abierta.

### 1. Pantalla "Caja"
- Si hay una caja abierta: mostrar su estado actual en vivo (fondo inicial, hora de apertura, total vendido hasta el momento, cantidad de ventas) y el botón "Cerrar caja".
- Si no hay caja abierta: mostrar el botón "Abrir caja" con el campo de fondo inicial opcional.

### 2. Pantalla "Historial de Cajas"
- Listado de todas las `CajaSesion` con `estado: cerrada`, ordenadas de más reciente a más antigua.
- Columnas: Nro de caja, Apertura, Cierre, Fondo inicial, Total efectivo, Total transferencia, Total ventas, Cantidad de ventas.
- Acción "Ver detalle" por fila: abre el detalle completo de esa sesión, incluyendo el listado de ventas que la componen (reutilizar el componente de detalle de venta ya existente si aplica).
- Acción "Exportar PDF" por fila: genera un PDF con el resumen del cierre (mismos datos que el detalle), descargable.

## EXPORTACIÓN A PDF
- Usar una librería estándar para generación de PDF en el stack ya definido (evaluar cuál encaja mejor con Electron — puede ser algo tipo `pdfmake` o generar el PDF vía una vista HTML renderizada, lo que resulte más simple de integrar sin agregar demasiado peso).
- El PDF debe incluir: nombre del negocio (desde `Configuracion`), número de caja, fecha/hora de apertura y cierre, fondo inicial, totales por medio de pago, total general, cantidad de ventas y anuladas.
- No hace falta diseño elaborado — priorizar que la información sea clara y esté completa.

---

## VERIFICACIÓN OBLIGATORIA

1. Abrir una caja con fondo inicial de $5000, confirmar que queda registrada correctamente.
2. Hacer 3-4 ventas de prueba (mezclando efectivo y transferencia, incluyendo alguna anulación) mientras la caja está abierta.
3. Confirmar que la pantalla de "Caja" muestra en vivo los totales acumulados correctamente mientras sigue abierta.
4. Cerrar la caja y confirmar que los totales calculados (efectivo, transferencia, esperado en caja, cantidad de ventas/anuladas) coinciden exactamente con lo esperado a mano.
5. Confirmar que aparece en el Historial de Cierres con todos los datos correctos.
6. Exportar el PDF de ese cierre y confirmar que el archivo se genera y contiene los datos correctos.
7. Intentar abrir una segunda caja mientras hay una abierta y confirmar que el sistema lo impide.

## SCOPE LOCKS

- ❌ NO implementar múltiples cajas físicas simultáneas (ej. dos puntos de venta en paralelo) — es una sola caja a la vez, tal como se usa hoy en el negocio.
- ❌ NO implementar registro de gastos/retiros de caja en esta tarea — quedó explícitamente fuera del alcance, es una futura mejora.
- ❌ NO dar la tarea por terminada sin correr los 7 puntos de verificación con datos reales.
- ⚠️ Si encontrás ambigüedad en cómo debe comportarse el POS cuando se intenta vender sin caja abierta, PREGUNTAR antes de decidir por tu cuenta — no asumir ni bloquear ni permitir sin confirmación.
