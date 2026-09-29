import { prisma } from './db'

export async function getConfiguracion() {
  let config = await prisma.configuracion.upsert({
    where: { id: 'config' },
    update: {},
    create: {
      id: 'config'
    }
  });

  return config
}

export async function updateConfiguracion(data: {
  nombreNegocio?: string;
  moneda?: string;
  ivaActivo?: boolean;
  porcentajeAlertaStock?: number;
  porcentajeDelivery?: number;
}) {
  return await prisma.configuracion.update({
    where: { id: 'config' },
    data
  })
}
