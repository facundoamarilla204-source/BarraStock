-- Migration: Unificar Ingrediente + Producto
-- Los datos ya fueron migrados por el script migrateData.js
-- Las columnas nuevas ya existen en Producto via ALTER TABLE directo

-- DropIndex (Ingrediente)
DROP INDEX IF EXISTS "Ingrediente_nombre_idx";

-- DropTable (Ingrediente)
PRAGMA foreign_keys=off;
DROP TABLE IF EXISTS "Ingrediente";
PRAGMA foreign_keys=on;

-- RedefineTables: RecetaItem (quitar ingredienteId, hacer productoId NOT NULL)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_RecetaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recetaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "unidad" TEXT NOT NULL,
    CONSTRAINT "RecetaItem_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "Receta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecetaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RecetaItem" ("cantidad", "id", "productoId", "recetaId", "unidad") SELECT "cantidad", "id", "productoId", "recetaId", "unidad" FROM "RecetaItem";
DROP TABLE "RecetaItem";
ALTER TABLE "new_RecetaItem" RENAME TO "RecetaItem";
CREATE INDEX "RecetaItem_recetaId_idx" ON "RecetaItem"("recetaId");
CREATE INDEX "RecetaItem_productoId_idx" ON "RecetaItem"("productoId");

-- RedefineTables: Producto (formalizar columnas nuevas que ya existen via ALTER TABLE)
CREATE TABLE "new_Producto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "stock" REAL NOT NULL DEFAULT 0,
    "precio" REAL NOT NULL DEFAULT 0,
    "costo" REAL NOT NULL DEFAULT 0,
    "categoria" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "unidadMedida" TEXT NOT NULL DEFAULT 'unidad',
    "tamanioEnvase" REAL,
    "vendiblePorUnidad" BOOLEAN NOT NULL DEFAULT true
);
-- IMPORTANTE: Copiar TODAS las columnas incluyendo las nuevas para preservar datos migrados
INSERT INTO "new_Producto" ("id", "nombre", "stock", "precio", "costo", "categoria", "activo", "createdAt", "updatedAt", "unidadMedida", "tamanioEnvase", "vendiblePorUnidad")
  SELECT "id", "nombre", "stock", "precio", "costo", "categoria", "activo", "createdAt", "updatedAt", "unidadMedida", "tamanioEnvase", "vendiblePorUnidad" FROM "Producto";
DROP TABLE "Producto";
ALTER TABLE "new_Producto" RENAME TO "Producto";
CREATE INDEX "Producto_nombre_idx" ON "Producto"("nombre");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
