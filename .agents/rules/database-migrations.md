# Reglas de Migración y Base de Datos (BarraStock)

## Fallbacks de Esquema (db.ts)
**¡CRÍTICO!** Siempre que modifiques el archivo `prisma/schema.prisma` para agregar nuevas columnas o tablas:
1. ESTÁS OBLIGADO a actualizar el archivo `src/main/services/db.ts`.
2. Debes agregar las sentencias `ALTER TABLE` o `CREATE TABLE` correspondientes en el bloque de `alterStatements` y `createTables` que funcionan como *fallback*.
3. Esto es debido a que las migraciones de Prisma suelen fallar en el entorno empaquetado de Electron, y el fallback en `db.ts` es la única garantía de que la base de datos de los usuarios se actualice sin errores (lo que evitará pantallas blancas o crasheos de `PrismaClientKnownRequestError`).
4. Revisa siempre que los nombres de las columnas y tablas coincidan exactamente.
