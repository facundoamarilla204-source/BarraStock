import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'fakuanillo59@gmail.com'
  const plainText = '654321'
  const hash = await bcrypt.hash(plainText, 10)
  
  const config = await prisma.configuracion.findFirst({
    where: { licenciaEmail: email }
  })
  
  if (!config) {
    console.log(`No se encontro configuracion con email ${email}`)
    
    // Tratamos de buscar la única configuración que haya
    const anyConfig = await prisma.configuracion.findFirst()
    if (anyConfig) {
      console.log(`Actualizando la configuracion existente (${anyConfig.licenciaEmail}) para que sea ${email}`)
      await prisma.configuracion.update({
        where: { id: anyConfig.id },
        data: {
          licenciaEmail: email,
          passwordHashLocal: hash
        }
      })
      console.log('Contraseña y email actualizados.')
    } else {
      console.log('No hay ninguna configuracion en la base de datos.')
    }
  } else {
    await prisma.configuracion.update({
      where: { id: config.id },
      data: { passwordHashLocal: hash }
    })
    console.log(`Contraseña actualizada para ${email}`)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
