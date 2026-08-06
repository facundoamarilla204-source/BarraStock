-- CreateTable
CREATE TABLE "Ingrediente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "stock" REAL NOT NULL DEFAULT 0,
    "costo" REAL NOT NULL DEFAULT 0,
    "categoria" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "stock" REAL NOT NULL DEFAULT 0,
    "precio" REAL NOT NULL,
    "costo" REAL NOT NULL DEFAULT 0,
    "categoria" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Receta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "precio" REAL NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RecetaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recetaId" TEXT NOT NULL,
    "ingredienteId" TEXT,
    "productoId" TEXT,
    "cantidad" REAL NOT NULL,
    "unidad" TEXT NOT NULL,
    CONSTRAINT "RecetaItem_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "Receta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecetaItem_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "Ingrediente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecetaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" REAL NOT NULL,
    "medioPago" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "anuladaEn" DATETIME,
    "motivoAnulacion" TEXT
);

-- CreateTable
CREATE TABLE "DetalleVenta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "productoId" TEXT,
    "recetaId" TEXT,
    "cantidad" REAL NOT NULL,
    "precioUnitario" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    CONSTRAINT "DetalleVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DetalleVenta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DetalleVenta_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "Receta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'config',
    "nombreNegocio" TEXT NOT NULL DEFAULT 'Mi Negocio',
    "moneda" TEXT NOT NULL DEFAULT 'ARS',
    "ivaActivo" BOOLEAN NOT NULL DEFAULT false,
    "porcentajeAlertaStock" REAL NOT NULL DEFAULT 10,
    "licenciaEmail" TEXT,
    "licenciaCodigo" TEXT,
    "licenciaVence" DATETIME,
    "licenciaEstado" TEXT NOT NULL DEFAULT 'bloqueada',
    "licenciaUltimoCheck" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Ingrediente_nombre_idx" ON "Ingrediente"("nombre");

-- CreateIndex
CREATE INDEX "Producto_nombre_idx" ON "Producto"("nombre");

-- CreateIndex
CREATE INDEX "Receta_nombre_idx" ON "Receta"("nombre");

-- CreateIndex
CREATE INDEX "RecetaItem_recetaId_idx" ON "RecetaItem"("recetaId");

-- CreateIndex
CREATE INDEX "RecetaItem_ingredienteId_idx" ON "RecetaItem"("ingredienteId");

-- CreateIndex
CREATE INDEX "RecetaItem_productoId_idx" ON "RecetaItem"("productoId");

-- CreateIndex
CREATE INDEX "Venta_fecha_idx" ON "Venta"("fecha");

-- CreateIndex
CREATE INDEX "Venta_estado_idx" ON "Venta"("estado");

-- CreateIndex
CREATE INDEX "DetalleVenta_ventaId_idx" ON "DetalleVenta"("ventaId");

-- CreateIndex
CREATE INDEX "DetalleVenta_productoId_idx" ON "DetalleVenta"("productoId");

-- CreateIndex
CREATE INDEX "DetalleVenta_recetaId_idx" ON "DetalleVenta"("recetaId");
