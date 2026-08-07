# BarraStock (MVP)

Sistema de punto de venta (POS) y gestión de inventario offline-first para barras.

## Arquitectura

- **Framework:** Electron + Vite
- **Frontend:** React + TypeScript
- **Estilos:** Tailwind CSS v3 + shadcn/ui
- **Base de Datos Local:** SQLite
- **ORM:** Prisma
- **Estado Global:** Zustand

## Scripts Disponibles

- `npm run dev` - Inicia la aplicación en modo desarrollo.
- `npm run build` - Construye la aplicación para producción.
- `npm run typecheck` - Verifica los tipos TypeScript en `src/main`, `src/preload` y `src/renderer`.

## Publicación de Actualizaciones (Fase 10)

Las actualizaciones automáticas se distribuyen a través de GitHub Releases usando `electron-updater`.

Para publicar una nueva versión:
1. Actualiza la versión en `package.json`.
2. Genera un **GitHub Personal Access Token** con permisos completos sobre el repositorio (`repo`).
3. Exporta el token como variable de entorno `GH_TOKEN`.
   - En Windows (PowerShell): `$env:GH_TOKEN="tu_token_aqui"`
   - En Mac/Linux: `export GH_TOKEN="tu_token_aqui"`
4. Ejecuta el build de publicación:
   - Para Windows: `npm run build:win -- -p always`
   - Para Mac: `npm run build:mac -- -p always`

**IMPORTANTE:** Sin la variable `GH_TOKEN`, Electron Builder generará los instaladores locales pero **no los subirá a GitHub**, rompiendo el flujo de actualizaciones automáticas para los usuarios.

## Base de Datos en Producción (SQLite)

Para asegurar que la aplicación siempre tenga permisos de lectura y escritura (evitando conflictos en `Program Files`), la base de datos se guarda en la carpeta de datos del usuario de Windows:
- `%APPDATA%\BarraStock\database.db` (Usualmente `C:\Users\TU_USUARIO\AppData\Roaming\BarraStock\database.db`)

### Flujo Completo: Cambiar de Computadora (Backup & Restauración)

Si un cliente necesita migrar BarraStock a una nueva PC conservando todos sus datos (productos, caja, configuración), el flujo oficial documentado es el siguiente:

1. **En la PC vieja:** Ir a `Configuración` → `Copia de Seguridad` → presionar **"Hacer copia de seguridad"** y guardarla en un pendrive o una carpeta sincronizada en la nube (ej. Google Drive).
2. **En la PC nueva:** Instalar BarraStock normalmente (descargando el instalador).
3. **Activar licencia en PC nueva:** Como el código de activación original puede figurar como usado (vinculado a la PC anterior), usar el flujo de **"Recuperar mi licencia"** en la pantalla inicial, recibiendo el código en el email.
4. **Restaurar datos:** Una vez dentro del sistema (vacío), ir a `Configuración` → `Copia de Seguridad` → presionar **"Restaurar copia de seguridad"** y elegir el archivo `.db` guardado en el paso 1.
5. **Listo:** La aplicación se reiniciará automáticamente y cargará todos los datos idénticos al momento del backup.

> **Nota sobre Licencias y Backups:** El estado local de la licencia se guarda en la misma base de datos. Si se restaura un backup antiguo, es posible que la fecha de vencimiento local se restaure a un estado anterior. Sin embargo, el chequeo periódico silencioso (Fase 9) de la aplicación consultará automáticamente al servidor web en segundo plano y actualizará las fechas reales en caso de discrepancias, por lo que no se requiere acción manual.

## Firma de Código (Code Signing) - Windows

Actualmente, el instalador no cuenta con una firma digital. Esto provoca que Windows y Microsoft Defender SmartScreen muestren un cuadro de advertencia de **"Editor Desconocido" (Unknown Publisher)** durante la instalación.

Para eliminar esta advertencia, será necesario adquirir un certificado de firma de código (Code Signing Certificate).
Existen dos tipos:
1. **Standard Code Signing (Aprox. $100-200 USD/año)**: Quita el mensaje de "Editor Desconocido", pero SmartScreen todavía podría mostrar una advertencia hasta que el archivo acumule "reputación" (muchas descargas).
2. **EV Code Signing (Aprox. $300+ USD/año y requiere un token USB físico)**: Elimina la advertencia de SmartScreen de forma inmediata en el 100% de los casos. Ideal para productos comerciales serios.

**Cómo integrarlo cuando lo compres:**
Una vez que obtengas el archivo `.pfx` y la contraseña, debes agregar las variables de entorno en el entorno donde compiles:
- `$env:CSC_LINK="ruta/o/archivo.pfx"`
- `$env:CSC_KEY_PASSWORD="tu_contraseña"`
Y `electron-builder` firmará el `.exe` automáticamente durante el `npm run build:win`.

## Comandos Prisma

- `npx prisma generate` - Genera el Prisma Client.
- `npx prisma studio` - Abre el explorador de base de datos visual de Prisma en el navegador.
- `$env:DATABASE_URL="file:./template.db"; npx prisma db push` - Crea el esquema inicial en la base de datos de plantilla.

## Notas Técnicas

- Se eliminaron los enumerados (`enum`) del esquema `schema.prisma` ya que Prisma no soporta `enum` con el conector de `sqlite`. Todo campo tipo `enum` ha sido convertido a `String`.
- La UI se sirve a través de la carpeta `src/renderer/src`.
- Los endpoints IPC para comunicación Base de Datos / UI se encuentran en `src/main/index.ts`.
