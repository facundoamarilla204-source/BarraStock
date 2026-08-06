# PROMPT — Antigravity | BarraStock | Fase 1.A — Setup del Proyecto

## CONTEXTO DEL PROYECTO

Estás ayudando a construir **BarraStock**, un software de escritorio para Windows (POS + inventario) para kioscos/bares que venden tragos armados y productos cerrados. El PRD completo está en `docs/PRD-BarraStock-v2.md` — leelo antes de empezar para entender el producto completo, aunque en esta tarea solo vas a hacer el setup inicial.

**Arquitectura:** Offline-first. Toda la app corre localmente contra SQLite. No hay backend propio corriendo en esta fase (el backend de licencias/Supabase se integra más adelante, NO en esta tarea).

**Stack definido (no cambiar sin consultar):**
- Electron + Electron Builder
- React + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand (estado global)
- SQLite + Prisma ORM
- Vite como bundler del frontend

---

## OBJETIVO DE ESTA TAREA

Dejar el proyecto **corriendo localmente** con:
1. Estructura base de Electron + React + TypeScript funcionando (ventana abre, hot reload andando)
2. Tailwind CSS + shadcn/ui configurados y probados con un componente de ejemplo
3. Prisma configurado con SQLite, usando el schema ya provisto en `prisma/schema.prisma` (NO modificarlo — ya está definido)
4. Migración inicial de Prisma corrida exitosamente, base de datos creada
5. Zustand instalado con un store de ejemplo mínimo (puede ser vacío/placeholder)
6. Estructura de carpetas ordenada para el proyecto completo (ver abajo)
7. Scripts de `package.json` funcionando: `dev` (levanta Electron + Vite con hot reload), `build` (genera el instalador con Electron Builder)

**No se espera funcionalidad de negocio en esta tarea** — nada de POS, ventas, ni CRUDs todavía. Es únicamente el esqueleto técnico funcionando de punta a punta.

---

## ESTRUCTURA DE CARPETAS ESPERADA

```
barrastock/
├── docs/
│   └── PRD-BarraStock-v2.md          (ya existe, no tocar)
├── prisma/
│   └── schema.prisma                  (ya existe, no tocar)
├── electron/
│   ├── main.ts                        (proceso principal de Electron)
│   └── preload.ts                     (bridge seguro entre main y renderer)
├── src/
│   ├── main.tsx                       (entry point de React)
│   ├── App.tsx
│   ├── components/
│   │   └── ui/                        (componentes shadcn/ui)
│   ├── stores/                        (stores de Zustand)
│   ├── lib/                           (utilidades, cliente de Prisma, etc.)
│   └── styles/
│       └── globals.css                (Tailwind)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── electron-builder.json
```

---

## PASOS SUGERIDOS (podés ajustar el orden si tiene más sentido técnico)

1. Inicializar proyecto Node + TypeScript
2. Instalar y configurar Electron + Vite (usar un template probado tipo `electron-vite` o armarlo a mano, lo que sea más estable)
3. Configurar Tailwind CSS + inicializar shadcn/ui, agregar 1-2 componentes de prueba (ej. Button, Card) para验 confirmar que el theming funciona
4. Instalar Prisma, apuntar el `datasource` a SQLite local (archivo `.db` dentro de una carpeta de datos de usuario, no versionada en git)
5. Correr `prisma generate` y `prisma migrate dev` contra el schema ya existente en `prisma/schema.prisma`
6. Instalar Zustand, crear un store vacío de ejemplo en `src/stores/`
7. Armar una pantalla mínima en `App.tsx` que:
   - Confirme visualmente que Tailwind/shadcn están funcionando (mostrar un componente estilizado)
   - Haga una consulta simple a la base (ej: contar cuántas filas hay en `Configuracion`) y la muestre en pantalla, como prueba de que Prisma + SQLite están conectados end-to-end
8. Configurar Electron Builder con metadata básica (nombre: BarraStock, ícono placeholder si no hay uno todavía, target: Windows .exe)
9. Documentar en un `README.md` corto cómo correr el proyecto (`npm install`, `npm run dev`, `npm run build`)

---

## SCOPE LOCKS (no hacer sin confirmación explícita)

- ❌ NO modificar el `schema.prisma` provisto — si creés que falta algo, avisar y preguntar, no cambiarlo por tu cuenta
- ❌ NO implementar lógica de negocio (ventas, descuento de stock, POS, CRUDs) — es tarea de una fase posterior
- ❌ NO integrar Supabase ni sistema de licencias todavía
- ❌ NO instalar librerías fuera del stack definido arriba sin justificar por qué son necesarias y pedir confirmación
- ❌ NO hacer commits/push a ningún repositorio remoto — solo trabajar local
- ❌ NO generar el instalador final (`.exe`) todavía si implica configurar firma de código — dejar el build sin firmar por ahora, eso se resuelve en una fase posterior

---

## CRITERIO DE ÉXITO

La tarea está completa cuando, corriendo `npm run dev`:
- Se abre una ventana de Electron
- Se ve una UI con al menos un componente shadcn/ui estilizado con Tailwind
- La pantalla muestra un dato real leído desde SQLite vía Prisma (confirmando la cadena completa: Electron → React → Prisma → SQLite)
- Los cambios en el código de React se reflejan con hot reload sin reiniciar la app entera

Si algo de esto no se puede lograr por una limitación técnica real, explicar el problema concreto antes de improvisar una solución que se aparte del stack definido.
