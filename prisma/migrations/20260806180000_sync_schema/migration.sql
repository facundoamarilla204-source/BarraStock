-- CreateTable
CREATE TABLE "CajaSesion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "fondoInicial" REAL NOT NULL DEFAULT 0,
    "fechaApertura" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" DATETIME,
    "totalEfectivo" REAL,
    "totalTransferencia" REAL,
    "totalVentas" REAL,
    "totalEsperadoCaja" REAL,
    "cantidadVentas" INTEGER,
    "cantidadAnuladas" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'abierta'
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Venta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER,
    "cajaSesionId" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" REAL NOT NULL,
    "medioPago" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "anuladaEn" DATETIME,
    "motivoAnulacion" TEXT,
    "montoRecibido" REAL,
    "vuelto" REAL,
    CONSTRAINT "Venta_cajaSesionId_fkey" FOREIGN KEY ("cajaSesionId") REFERENCES "CajaSesion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Venta" ("anuladaEn", "estado", "fecha", "id", "medioPago", "motivoAnulacion", "total") SELECT "anuladaEn", "estado", "fecha", "id", "medioPago", "motivoAnulacion", "total" FROM "Venta";
DROP TABLE "Venta";
ALTER TABLE "new_Venta" RENAME TO "Venta";
CREATE INDEX "Venta_fecha_idx" ON "Venta"("fecha");
CREATE INDEX "Venta_estado_idx" ON "Venta"("estado");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CajaSesion_numero_key" ON "CajaSesion"("numero");

