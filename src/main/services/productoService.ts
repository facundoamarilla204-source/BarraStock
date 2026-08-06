import { prisma } from './db'

export async function getProductos() {
  return await prisma.producto.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' }
  })
}

export async function createProducto(data: {
  nombre: string
  precio?: number
  stock?: number
  costo?: number
  categoria?: string
  unidadMedida?: string
  tamanioEnvase?: number | null
  vendiblePorUnidad?: boolean
  cantidadEnvases?: number
}) {
  // Calcular stock real según unidad de medida
  let stockReal = data.stock ?? 0

  if (data.unidadMedida && data.unidadMedida !== 'unidad' && data.tamanioEnvase && data.cantidadEnvases != null) {
    // ml o gr: stock = cantidadEnvases × tamañoEnvase
    stockReal = data.cantidadEnvases * data.tamanioEnvase
  }

  if (stockReal < 0) throw new Error('El stock no puede ser negativo')

  return await prisma.producto.create({
    data: {
      nombre: data.nombre,
      precio: data.precio ?? 0,
      stock: stockReal,
      costo: data.costo ?? 0,
      categoria: data.categoria,
      unidadMedida: data.unidadMedida ?? 'unidad',
      tamanioEnvase: data.tamanioEnvase ?? null,
      vendiblePorUnidad: data.vendiblePorUnidad ?? true
    }
  })
}

export async function updateProducto(
  id: string,
  data: {
    nombre?: string
    precio?: number
    stock?: number
    costo?: number
    categoria?: string
    activo?: boolean
    unidadMedida?: string
    tamanioEnvase?: number | null
    vendiblePorUnidad?: boolean
    cantidadEnvases?: number
  }
) {
  // Si envían cantidadEnvases + tamanioEnvase, recalcular stock
  const updateData: any = { ...data }
  delete updateData.cantidadEnvases

  if (data.cantidadEnvases != null && data.tamanioEnvase != null) {
    updateData.stock = data.cantidadEnvases * data.tamanioEnvase
  }

  return await prisma.producto.update({
    where: { id },
    data: updateData
  })
}

export async function deleteProducto(id: string) {
  // Soft delete
  return await prisma.producto.update({
    where: { id },
    data: { activo: false }
  })
}
