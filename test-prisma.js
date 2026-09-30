const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  try {
    await prisma.configuracion.update({
      where: {id: 'config'},
      data: { licenciaVence: new Date('15/08/2026') }
    });
    console.log("Success");
  } catch(e) {
    console.log("Error:", e.message);
  }
} 
main().catch(console.error).finally(()=>prisma.$disconnect());
