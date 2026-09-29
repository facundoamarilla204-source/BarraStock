-- AlterTable
ALTER TABLE "DetalleVenta" ADD COLUMN "costoUnitario" REAL;
ALTER TABLE "DetalleVenta" ADD COLUMN "ganancia" REAL;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN "codigoBarras" TEXT;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN "costoDelivery" REAL DEFAULT 0;
ALTER TABLE "Venta" ADD COLUMN "gananciaBruta" REAL;
ALTER TABLE "Venta" ADD COLUMN "pagoDelivery" REAL DEFAULT 0;

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "razonSocial" TEXT NOT NULL,
    "cuit" TEXT,
    "contacto" TEXT,
    "telefono" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "localidad" TEXT,
    "tipo" TEXT,
    "condicionPago" TEXT,
    "diasVencimiento" INTEGER DEFAULT 0,
    "limiteCredito" REAL DEFAULT 0,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Compra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proveedorId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numero" TEXT,
    "total" REAL NOT NULL DEFAULT 0,
    "importePagado" REAL NOT NULL DEFAULT 0,
    "saldoPendiente" REAL NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "fechaVencimiento" DATETIME,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DetalleCompra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "compraId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "costoUnitario" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    CONSTRAINT "DetalleCompra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DetalleCompra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PagoProveedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proveedorId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importe" REAL NOT NULL,
    "medioPago" TEXT NOT NULL,
    "referencia" TEXT,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PagoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProveedorMovimiento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proveedorId" TEXT NOT NULL,
    "compraId" TEXT,
    "pagoId" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" REAL NOT NULL,
    "saldoResultante" REAL NOT NULL,
    CONSTRAINT "ProveedorMovimiento_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProveedorMovimiento_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProveedorMovimiento_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "PagoProveedor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductoProveedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proveedorId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "ultimoCosto" REAL,
    "fechaUltimaCompra" DATETIME,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ProductoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductoProveedor_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Configuracion" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'config',
    "nombreNegocio" TEXT NOT NULL DEFAULT 'Mi Negocio',
    "moneda" TEXT NOT NULL DEFAULT 'ARS',
    "ivaActivo" BOOLEAN NOT NULL DEFAULT false,
    "ivaPorcentaje" REAL NOT NULL DEFAULT 21,
    "porcentajeAlertaStock" REAL NOT NULL DEFAULT 10,
    "porcentajeDelivery" REAL NOT NULL DEFAULT 100,
    "licenciaEmail" TEXT,
    "licenciaCodigo" TEXT,
    "licenciaVence" DATETIME,
    "licenciaEstado" TEXT NOT NULL DEFAULT 'bloqueada',
    "licenciaUltimoCheck" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Configuracion" ("id", "ivaActivo", "ivaPorcentaje", "licenciaCodigo", "licenciaEmail", "licenciaEstado", "licenciaUltimoCheck", "licenciaVence", "moneda", "nombreNegocio", "porcentajeAlertaStock", "updatedAt") SELECT "id", "ivaActivo", "ivaPorcentaje", "licenciaCodigo", "licenciaEmail", "licenciaEstado", "licenciaUltimoCheck", "licenciaVence", "moneda", "nombreNegocio", "porcentajeAlertaStock", "updatedAt" FROM "Configuracion";
DROP TABLE "Configuracion";
ALTER TABLE "new_Configuracion" RENAME TO "Configuracion";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ProductoProveedor_proveedorId_productoId_key" ON "ProductoProveedor"("proveedorId", "productoId");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_codigoBarras_key" ON "Producto"("codigoBarras");
