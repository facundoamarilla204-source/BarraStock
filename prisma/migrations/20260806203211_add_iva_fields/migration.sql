-- AlterTable
ALTER TABLE "DetalleVenta" ADD COLUMN "iva" REAL;
ALTER TABLE "DetalleVenta" ADD COLUMN "neto" REAL;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN "iva" REAL;
ALTER TABLE "Venta" ADD COLUMN "ivaPorcentaje" REAL;
ALTER TABLE "Venta" ADD COLUMN "neto" REAL;

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
    "licenciaEmail" TEXT,
    "licenciaCodigo" TEXT,
    "licenciaVence" DATETIME,
    "licenciaEstado" TEXT NOT NULL DEFAULT 'bloqueada',
    "licenciaUltimoCheck" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Configuracion" ("id", "ivaActivo", "licenciaCodigo", "licenciaEmail", "licenciaEstado", "licenciaUltimoCheck", "licenciaVence", "moneda", "nombreNegocio", "porcentajeAlertaStock", "updatedAt") SELECT "id", "ivaActivo", "licenciaCodigo", "licenciaEmail", "licenciaEstado", "licenciaUltimoCheck", "licenciaVence", "moneda", "nombreNegocio", "porcentajeAlertaStock", "updatedAt" FROM "Configuracion";
DROP TABLE "Configuracion";
ALTER TABLE "new_Configuracion" RENAME TO "Configuracion";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
