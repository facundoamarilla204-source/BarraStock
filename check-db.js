const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const config = await prisma.configuracion.findUnique({where: {id: 'config'}}); 
  console.log(config); 
} 
main().catch(console.error).finally(()=>prisma.$disconnect());
