import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando backfill de números de venta...')

  // Obtener todas las ventas ordenadas por fecha (las más antiguas primero)
  const ventas = await prisma.venta.findMany({
    orderBy: { fecha: 'asc' }
  })

  console.log(`Se encontraron ${ventas.length} ventas.`)

  let count = 1
  for (const venta of ventas) {
    if (venta.numero === null) {
      await prisma.venta.update({
        where: { id: venta.id },
        data: { numero: count }
      })
      console.log(`Venta ${venta.id} actualizada con número #${count}`)
    } else {
      console.log(`Venta ${venta.id} ya tiene número #${venta.numero}`)
      if (venta.numero >= count) {
        count = venta.numero // Asegurar que count se mantenga sinc con los nums existentes
      }
    }
    count++
  }

  console.log('Backfill completado exitosamente.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
