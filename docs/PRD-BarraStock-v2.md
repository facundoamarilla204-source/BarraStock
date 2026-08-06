# PRD — BarraStock

**Nombre del proyecto:** BarraStock
**Autor:** Facundo (PlayComun)
**Versión:** 2.0
**Estado:** Fase 0 → Fase 1 (arranque de desarrollo)
**Plataforma:** Windows (.exe)
**Arquitectura:** Desktop First (Offline-First)

---

## 1. Resumen Ejecutivo

BarraStock es un software de escritorio para Windows pensado para **kioscos, bares, despensas y negocios de bebidas** que venden tanto **tragos armados** (fernet-coca, gancia, combos, etc.) como **productos cerrados** (botellas, golosinas, gaseosas, snacks).

Reemplaza el control manual (cuaderno, memoria, Excel) por un sistema que integra **caja, inventario y recetas** en una sola aplicación.

El diferencial central es el **motor de recetas**: cuando se vende un trago o combo, el sistema descuenta automáticamente cada ingrediente que lo compone (en ml, gramos o unidades), no solo "1 producto vendido". Esto da control real de stock, costo y rentabilidad, cosa que un POS tradicional no ofrece.

Funciona **100% offline** en el uso diario. Solo necesita internet de forma puntual para activar y renovar la licencia.

---

## 2. Problema

Un POS tradicional descuenta únicamente productos completos.

**Ejemplo:**
Se vende "Fernet Cola".
El sistema tradicional descuenta: ✓ 1 producto vendido.
Pero no sabe que en realidad se consumieron 50 ml de fernet + 200 ml de cola + hielo.

**Consecuencia:** inventario incorrecto, pérdidas no detectadas, costos mal calculados, compras ineficientes, y en un negocio con 200-300 productos y decenas de tragos armados, esto se vuelve imposible de controlar a mano.

---

## 3. Solución

Cada trago o combo tiene una **receta**: sabe exactamente qué ingredientes o productos consume y en qué cantidad.

Al vender:
1. Se registra la venta
2. Se cobra (efectivo o transferencia)
3. Se descuentan automáticamente los ingredientes/productos involucrados
4. Se actualiza el inventario en tiempo real
5. Se calcula costo y ganancia (Fase 2)

Todo en una operación atómica: si algo falla a mitad de camino, no queda stock descontado a medias.

---

## 4. Público objetivo

Kioscos con venta de tragos, bares, cervecerías, despensas de bebidas, y negocios similares donde conviven **venta de producto cerrado** y **preparación de tragos/combos simples** (sin coctelería de autor compleja).

**Cliente piloto:** el propio negocio de Facundo — ~200-300 productos, ~40 tragos armados, un solo usuario operando.

---

## 5. Objetivo del producto

Dar a un kiosco/bar chico o mediano una herramienta profesional de gestión de caja e inventario, sin depender de internet para operar día a día, con una barrera de entrada baja (instalación simple, uso intuitivo, sin curva de aprendizaje larga).

---

## 6. Modelo de negocio

- **Licencia paga por período** (a definir mensual/trimestral inicialmente; anual con descuento como opción futura una vez validado el producto).
- Venta y renovación a través de una **página web propia** (pago con Mercado Pago/tarjeta).
- Sin procesamiento de pagos dentro de la app del cliente — el software solo registra el medio de pago (efectivo/transferencia) como dato informativo.

### Flujo de pago (de punta a punta)

1. El cliente compra/renueva en la página web de BarraStock (no dentro de la app de escritorio).
2. Pago procesado con Mercado Pago (Checkout Pro u equivalente).
3. Un webhook de Mercado Pago notifica a una función backend (Supabase Edge Function) cuando el pago se aprueba.
4. Esa función actualiza automáticamente la fecha_vencimiento del cliente en la base de licencias de Supabase.
5. Activación inicial (primera vez): el cliente recibe por mail un código de activación único, lo ingresa una sola vez en la app junto a su email — esto requiere internet, es razonable porque es el momento de la compra.
6. Renovaciones posteriores (Opción B — renovación silenciosa): el cliente NO vuelve a ingresar ningún código. La app detecta sola, en su chequeo periódico, que la fecha de vencimiento se actualizó en Supabase, y se sincroniza automáticamente. Cero fricción para el cliente después de la activación inicial.

### Licenciamiento — funcionamiento técnico

- Activación inicial: requiere internet, con código de activación (único uso).
- Uso diario: 100% offline, sin ninguna dependencia de conexión.
- Renovación: el sistema guarda localmente una fecha de vencimiento (licencia_vence). Cerca del vencimiento, si hay internet, chequea contra Supabase si ya se renovó (pago detectado vía webhook) y sincroniza la fecha sola, sin intervención del cliente. Si no hay internet, sigue funcionando en modo gracia por unos días, sin bloquear ventas de golpe.
- Backend de licencias: Supabase (cliente_id, email, fecha_inicio, fecha_vencimiento, estado), más una Edge Function que procesa el webhook de Mercado Pago.
- Esta misma ventana de conectividad se reutiliza para chequear actualizaciones de la app (ver sección 15).

---

## 7. Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS + shadcn/ui |
| Estado | Zustand y/o React Query |
| Desktop | Electron (Electron Builder para empaquetado) |
| Backend local | Node.js |
| Base de datos local | SQLite + Prisma ORM |
| Backend de licencias/updates | Supabase |
| Actualizaciones | electron-updater |
| Reportes | PDF (Fase 2) |
| Impresión | Térmica 58/80mm (Fase 2 — no hay impresora en el piloto todavía) |
| Código de barras | Backlog futuro |

**Arquitectura:** Offline-first. Toda la operación vive en SQLite local. Internet es opcional para el uso diario, y puntual solo para licencia/updates.

---

## 8. Especificaciones técnicas

**Requisitos mínimos (cliente final):**
- Windows 10 o superior (64 bits)
- 4 GB RAM (8 GB recomendado)
- 1 GB de disco libre
- Cualquier CPU de los últimos ~8 años

**Peso estimado de la app:** instalador ~80-150 MB, instalado ~200-350 MB en disco, ~150-400 MB de RAM en uso.

**Entorno de desarrollo (Facundo):** recomendado 16 GB RAM, SSD, 10-20 GB libres para el proyecto (node_modules + builds de prueba).

---

## 9. Roles y usuarios

**MVP:** usuario único, sin sistema de roles. Vos operás todo (venta, carga de stock, recetas, configuración).

**Backlog (Fase 2+):** roles Administrador / Gerente / Cajero / Bartender, tal como en la v1 del documento, para cuando el negocio sume empleados.

---

## 10. Modelo de datos — concepto central

Toda la lógica de venta se apoya en una entidad genérica: **Ítem Vendible**, que puede ser de dos tipos:

- **Producto simple** → descuenta stock directo (botella, golosina, gaseosa, etc.)
- **Receta** → descuenta ingredientes/productos según su composición (trago armado o combo)

**Tragos y Combos son el mismo mecanismo técnico** (una receta con ítems + cantidades) — solo cambia la categoría visual en el POS. Esto evita duplicar lógica.

### Entidades principales (MVP)

- **Ingrediente**: nombre, unidad (ml / gr / unidad), stock, costo, categoría
- **Producto**: nombre, stock, precio, costo, categoría
- **Receta** (trago o combo): nombre, categoría, ítems componentes (ingrediente o producto) con cantidad y unidad, precio de venta
- **Venta**: fecha, ítems vendidos, cantidad, medio de pago (efectivo/transferencia), total, estado (activa/anulada)
- **DetalleVenta**: ítem vendido, cantidad, precio unitario
- **Configuración**: nombre del negocio, moneda (ARS), IVA (on/off, configurable), % de alerta de stock bajo

---

## 11. Inventario inteligente

El stock de ingredientes se maneja siempre en la **unidad base** (ml, gr, o unidad), independientemente de cómo se compre el insumo.

**Ejemplo:**
Se compran 5 botellas de Vodka de 2 litros → stock real: 10.000 ml.
Se vende un trago con 50 ml de vodka → nuevo stock: 9.950 ml.
El sistema no depende de "cuántas botellas quedan", trabaja siempre con la cantidad real disponible.

**Unidades mixtas:** cada ingrediente define su propia unidad (ml, gr o unidad — por ejemplo, limón se carga como "unidad", no como ml). Las recetas heredan la unidad del ingrediente que usan.

---

## 12. Motor de recetas

Cada receta define sus componentes (ingredientes y/o productos) con cantidad exacta.

Al venderse, el sistema descuenta **todos los componentes en una sola operación atómica**. Si la operación falla a mitad de camino, no debe quedar stock descontado parcialmente.

Este mismo motor se usa tanto para **tragos** como para **combos** (ej. "Fernet + Coca"), ya que ambos son, en el fondo, una receta con ítems componentes.

---

## 13. Venta de productos

Los productos cerrados (botellas, latas, golosinas, gaseosas, snacks) se venden y descuentan directamente del stock del producto, sin pasar por el motor de recetas.

---

## 14. POS — Pantalla de Venta (módulo crítico del MVP)

**Estructura de la pantalla:**

- **Buscador grande**, con foco automático al abrir la pantalla, búsqueda por nombre parcial (código de barras queda para el futuro).
- **Botones grandes de categoría**: Tragos, Botellas, Golosinas, Combos, y las que se agreguen — configurables, no hardcodeadas.
- **Carrito lateral**: ítems agregados con cantidad editable.
- **Botón de cobro**: registra medio de pago (efectivo/transferencia), cierra la venta, dispara el descuento automático de stock.
- **Anulación de venta**: permite anular una venta ya cargada, reponiendo el stock correspondiente.

**Sin impresión de ticket en el MVP** (no hay impresora térmica en el piloto todavía — queda para Fase 2).

---

## 15. Actualizaciones de software

Se maneja con **electron-updater**:

1. Facundo publica una nueva versión (vía GitHub Releases o Supabase Storage).
2. La app chequea en background, si hay internet, si existe una versión nueva.
3. Si la hay, la descarga sin interrumpir el uso.
4. Avisa al usuario que se instalará en el próximo reinicio — nunca fuerza una actualización en medio del uso.
5. Si no hay internet, simplemente no encuentra la actualización y sigue con la versión actual sin errores.

Este chequeo se aprovecha en la misma ventana de conectividad que la validación de licencia.

---

## 16. Alertas

- **Stock bajo**: definido por un **porcentaje general configurable** (no por producto individual) en la Configuración.
- Aviso visual en el Dashboard cuando un producto/ingrediente cae bajo ese umbral.
- Si el stock llega a 0 o negativo, el sistema debe **avisar claramente** que no hay stock disponible de ese ítem (no bloquea la venta de forma agresiva, pero deja explícito el faltante).

---

## 17. Dashboard (mínimo, MVP)

- Stock actual (vista general)
- Alertas de stock bajo / agotado
- Ventas del día (cantidad y total, básico)

*(Ganancias, productos más vendidos, reportes elaborados → Fase 2)*

---

## 18. Configuración (MVP)

- Nombre del negocio
- Moneda: ARS (fijo por ahora)
- IVA: activable/desactivable (no obligatorio, preparado para el futuro)
- % de alerta de stock bajo
- Datos de licencia (estado, vencimiento, código de activación)

---

## 19. Roadmap

### Fase 0 — Definición del producto ✅
Este documento.

### Fase 1 — MVP (piloto)
- Setup Electron + React + TS + Tailwind + shadcn/ui + SQLite + Prisma
- Modelo de datos (Ítem Vendible: Producto / Receta)
- CRUD de Ingredientes, Productos, Recetas (tragos y combos)
- POS completo: búsqueda, categorías, carrito, cobro, descuento automático, anulación
- Dashboard mínimo
- Alertas de stock bajo por %
- Sistema de licencia (activación + renovación con modo gracia)
- Sistema de actualizaciones (electron-updater)
- Instalador Windows

### Fase 2 — Profesionalización
- Roles y permisos (Admin/Gerente/Cajero/Bartender)
- Costos automáticos y rentabilidad por receta
- Reportes (ventas, ganancias, inventario) en PDF
- Ajuste de stock manual con motivo (trazabilidad)
- Apertura/cierre/arqueo de caja formal
- Backups automáticos (local + posible cloud)
- Clientes y Proveedores con historial

### Fase 3 — Expansión comercial
- Impresión térmica (58/80mm)
- Código de barras (lectura USB)
- Integración de pagos real (Mercado Pago)
- Panel web de licencias/ventas más robusto
- Licencia anual con descuento

### Fase 4 — Futuro / backlog largo plazo
- Sincronización con la nube (SQLite como base local + sync)
- App móvil de consulta de reportes
- Panel web para dueños
- Facturación electrónica (ARCA/AFIP)
- Múltiples sucursales
- Gestión de mesas/comandas (si se expande a restaurantes)
- Integración con balanzas
- API pública para integraciones

---

## 20. Diferencial competitivo

BarraStock no es "otro POS": es un sistema que entiende que **un trago no es un producto, es una receta**. Controla el inventario a nivel de ingrediente, no de producto vendido, lo cual da una precisión de stock y costos que ningún sistema tradicional de caja ofrece — y lo hace funcionando completamente offline, algo clave para el tipo de negocio al que apunta (kioscos y bares que no siempre tienen internet estable).

---

## 21. Decisiones explícitamente fuera del MVP (para no perder de vista)

- Sin roles múltiples — usuario único
- Sin clientes/proveedores con historial
- Sin reportes PDF elaborados
- Sin impresión térmica
- Sin código de barras
- Sin ajuste de stock con trazabilidad (se edita a mano)
- Sin backups automáticos
- Sin integración de pagos real
- Sin apertura/cierre/arqueo formal de caja
