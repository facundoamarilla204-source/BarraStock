const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.configuracion.delete({ where: { id: 'config' } });
    console.log('Sesión cerrada correctamente (config eliminada).');
  } catch (e) {
    if (e.code === 'P2025') {
      console.log('Ya estaba cerrada (no se encontró la sesión).');
    } else {
      console.error(e);
    }
  } finally {
    await prisma.$disconnect();
  }
}
main();
