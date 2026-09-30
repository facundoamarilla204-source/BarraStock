const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const config = await prisma.configuracion.update({
    where: {id: 'config'},
    data: { licenciaVence: new Date('2026-08-05T00:00:00.000Z'), licenciaEstado: 'activa' }
  }); 
  console.log("Updated to 2026-08-05, activa"); 
} 
main().catch(console.error).finally(()=>prisma.$disconnect());
