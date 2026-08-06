import { prisma } from './db'

export async function getConfiguracion() {
  let config = await prisma.configuracion.findUnique({
    where: { id: 'config' }
  })

  // Si no existe, la creamos (singleton lazy initialization)
  if (!config) {
    config = await prisma.configuracion.create({
      data: { id: 'config' }
    })
  }

  return config
}

export async function updateConfiguracion(data: {
  nombreNegocio?: string;
  moneda?: string;
  ivaActivo?: boolean;
  porcentajeAlertaStock?: number;
}) {
  return await prisma.configuracion.update({
    where: { id: 'config' },
    data
  })
}
