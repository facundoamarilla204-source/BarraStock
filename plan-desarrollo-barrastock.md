# Plan de Desarrollo — BarraStock (de punta a punta)

Basado en PRD v2.0. Pensado para ejecutarse con Antigravity fase por fase, delegando cada bloque como una tarea acotada y verificable. Cada fase indica: objetivo, qué tipo de skill/capacidad del agente entra en juego, entregable concreto, y qué se supervisa de cerca vos mismo (no delegar 100% a ciegas).

---

## FASE 1 — Setup del proyecto
**Ya definida y en curso** (prompt ya armado).

- Skills en juego: scaffolding de proyecto, configuración de tooling (Vite/Electron/Tailwind), setup de ORM.
- Entregable: app Electron corriendo, Prisma+SQLite conectado, hot reload funcionando.
- Supervisión: revisar que el schema no se haya tocado, y que la estructura de carpetas quede como la definida.

---

## FASE 2 — Modelo de datos y capa de acceso (data layer)
**Objetivo:** dejar lista la capa de funciones que leen/escriben en SQLite vía Prisma, sin UI todavía.

- Migraciones aplicadas sobre `schema.prisma` (ya armado)
- Funciones CRUD base para: `Ingrediente`, `Producto`, `Receta`, `RecetaItem`, `Configuracion`
- Seed inicial de datos de prueba (unos 10-15 productos/ingredientes/recetas ficticios) para poder probar el resto de las fases sin cargar todo a mano
- Validaciones básicas a nivel de datos (ej: no permitir `RecetaItem` sin `ingredienteId` ni `productoId`, no permitir stock negativo directo en la carga)

**Skill en juego:** manejo de base de datos/ORM, generación de datos de prueba (seed/fixtures).
**Supervisión tuya:** validar que las reglas de negocio del PRD (unidades mixtas, ítem vendible genérico) estén bien reflejadas en las funciones, no solo en el schema.

---

## FASE 3 — Motor de venta y descuento de stock (núcleo crítico)
**Objetivo:** la función más importante del sistema — dado un carrito de compra, ejecutar la venta completa como transacción atómica.

Incluye:
- Función que recibe un carrito (lista de ítems: producto o receta + cantidad)
- Calcula el total
- Determina qué stock descontar por cada línea (directo si es producto, en cascada por `RecetaItem` si es receta)
- Ejecuta todo en una única transacción de Prisma (si algo falla, no queda nada descontado a medias)
- Crea `Venta` + `DetalleVenta`
- Función de **anulación de venta**: revierte el stock descontado y marca `estado: anulada` con motivo

**Skill en juego:** lógica de negocio compleja, transacciones de base de datos, manejo de errores.
**Supervisión tuya: ALTA.** Esta fase la trabajamos juntos paso a paso antes de que el agente la corra sola — es el corazón del producto y donde más plata se juega si hay un bug (stock mal descontado = pérdida real).

---

## FASE 4 — CRUDs con interfaz (pantallas de gestión)
**Objetivo:** pantallas para cargar y mantener el catálogo — sin esto el POS no tiene nada que vender.

- Pantalla de **Ingredientes**: listado, alta, edición, baja (soft delete con `activo`)
- Pantalla de **Productos**: listado, alta, edición, baja
- Pantalla de **Recetas** (tragos/combos): armado visual de receta — elegir nombre, categoría, precio, e ir agregando componentes (ingrediente o producto) con cantidad
- Búsqueda y filtro simple en cada listado (por nombre/categoría)

**Skill en juego:** generación de UI con shadcn/ui + Tailwind, formularios, tablas, validación de formularios (probablemente con algo tipo react-hook-form + zod).
**Supervisión tuya:** media — revisar UX de la pantalla de Recetas en particular, porque armar una receta con varios ingredientes tiene que ser rápido y claro, no una pantalla de formulario tediosa.

---

## FASE 5 — POS (pantalla de venta)
**Objetivo:** la pantalla que vas a usar todos los días.

- Buscador grande con foco automático, resultados en vivo
- Botones de categoría (Tragos, Botellas, Golosinas, Combos, configurables)
- Carrito lateral con cantidad editable y opción de quitar ítems
- Botón de cobro: selección de medio de pago (efectivo/transferencia), confirmación, ejecuta el motor de venta de la Fase 3
- Pantalla/listado de ventas del día con opción de anular una venta puntual

**Skill en juego:** UI compleja con estado (Zustand), integración de la lógica de negocio de Fase 3 con la interfaz, manejo de estados de carga/error.
**Supervisión tuya:** alta en la integración con el motor de venta (que el carrito arme bien el payload que espera la función atómica), media en el resto de la UI.

---

## FASE 6 — Dashboard y alertas
**Objetivo:** vista general al abrir la app.

- Resumen de ventas del día (cantidad, total)
- Listado de stock bajo/agotado según el % configurado
- Alerta visual clara cuando un ítem del carrito no tiene stock suficiente (en el POS también, no solo acá)

**Skill en juego:** UI de datos/consultas agregadas simples (conteos, sumas), sin necesidad de librería de gráficos todavía (eso es Fase 2 del roadmap de producto, con reportes PDF).
**Supervisión tuya:** baja — es bastante mecánico dado que ya tenés los datos de ventas y stock de fases anteriores.

---

## FASE 7 — Configuración
**Objetivo:** pantalla única de configuración del negocio.

- Nombre del negocio, moneda (fija ARS por ahora), IVA on/off
- % de alerta de stock bajo
- Sección de licencia: estado actual, fecha de vencimiento, campo para ingresar código de activación/renovación (placeholder de UI, la lógica real de licencia es Fase 9)

**Skill en juego:** formulario simple con persistencia en la tabla `Configuracion` (singleton).
**Supervisión tuya:** baja.

---

## FASE 8 — Testing del núcleo
**Objetivo:** antes de instalar esto en tu negocio real, dejar cubierto con tests automáticos lo que más te puede doler si falla.

- Tests unitarios de la función de venta (Fase 3): casos de venta simple, venta con receta, venta mixta, venta que debe fallar y no dejar stock a medias, anulación y reposición correcta de stock
- Tests de las validaciones de datos de Fase 2 (unidades mixtas, ítems sin componente válido, stock negativo)
- (Opcional si el agente lo soporta bien) algún test de integración básico del flujo completo: cargar producto → venderlo → verificar stock actualizado

**Skill en juego:** testing (unit tests, posiblemente con Vitest dado que ya usás Vite).
**Supervisión tuya:** revisar que los casos de test cubran los escenarios reales del PRD (no solo el "camino feliz").

---

## FASE 9 — Licenciamiento
**Objetivo:** implementar el sistema de activación y renovación offline-first que definimos.

- Tabla `Configuracion` ya tiene los campos (`licenciaEstado`, `licenciaVence`, etc.)
- Pantalla de activación inicial (pide email + código, valida contra Supabase, requiere internet)
- Lógica de chequeo periódico al arrancar la app: si se acerca el vencimiento y hay internet, consulta Supabase; si no hay internet, aplica modo gracia
- Bloqueo suave de la app si la licencia está vencida y se agotó el modo gracia (mensaje claro, no un crash)
- Backend mínimo en Supabase: tabla de clientes/licencias, función para validar estado

**Skill en juego:** integración con servicio externo (Supabase), manejo de estados offline/online, lógica de negocio sensible (cobro).
**Supervisión tuya: ALTA** — como marcamos antes, esto es lógica de negocio que afecta directamente cómo cobrás, no delegar sin revisar cada parte.

---

## FASE 10 — Actualizaciones automáticas
**Objetivo:** que las próximas versiones lleguen solas a los clientes (empezando por vos mismo).

- Integración de `electron-updater`
- Configuración de destino de publicación (GitHub Releases o Supabase Storage)
- Chequeo en background al arrancar (reutilizando la misma ventana de conectividad que la licencia)
- Descarga silenciosa + aviso de "se instalará al reiniciar"

**Skill en juego:** configuración de build/deploy, integración de librería específica de Electron.
**Supervisión tuya:** media — probar el flujo completo al menos una vez manualmente (publicar una v0.0.2 de prueba y confirmar que tu instalación de v0.0.1 la detecta).

---

## FASE 11 — Empaquetado e instalador final
**Objetivo:** un `.exe` instalable, presentable, para poner en tu PC del negocio.

- Configuración final de Electron Builder (ícono real, nombre, versión)
- Firma de código si es viable en esta etapa (para que Windows no tire el cartel de "aplicación no reconocida") — si no es viable todavía por costo/certificado, documentarlo como pendiente
- Generación del instalador `.exe`
- Prueba de instalación limpia en una máquina (o VM) distinta a la de desarrollo

**Skill en juego:** empaquetado/build de Electron, troubleshooting de instalación.
**Supervisión tuya:** alta en la prueba final — instalalo vos mismo en una máquina limpia antes de ponerlo en producción en tu negocio.

---

## FASE 12 — Piloto real (tu negocio)
**Objetivo:** validar todo en producción real, con vos como primer usuario.

- Instalación en la PC del negocio
- Carga real del catálogo completo (200-300 productos + 40 recetas) — no de prueba, el catálogo real
- Uso diario durante un período de prueba (ej. 2-4 semanas) mientras seguís atenta a bugs, fricciones de UX, y casos que no contemplamos
- Registro de todo lo que falle o incomode, para una ronda de ajustes antes de pensar en vender a otros

**Esto no es una tarea para Antigravity** — es uso real. Pero cualquier bug o ajuste que surja acá vuelve como una tarea puntual y acotada al agente (ej. "arreglá esto puntual del POS"), no como una fase grande nueva.

---

## Resumen visual del orden

```
1. Setup proyecto
2. Data layer (CRUD sin UI + seed)
3. Motor de venta (CRÍTICO, con vos)
4. CRUDs con UI
5. POS
6. Dashboard
7. Configuración
8. Testing del núcleo
9. Licenciamiento (CRÍTICO, con vos)
10. Actualizaciones automáticas
11. Empaquetado e instalador
12. Piloto real en tu negocio
```

**Nota sobre orden:** Fases 4-7 (CRUDs, POS, Dashboard, Configuración) se pueden reordenar o incluso paralelizar en distintas sesiones de Antigravity si querés — no tienen dependencias estrictas entre sí más allá de necesitar la Fase 2 y 3 ya resueltas. Fases 8-11 sí conviene mantenerlas al final, en ese orden, porque cada una depende de que el sistema ya esté funcionalmente completo.
