import { prisma } from './db'

export async function getProductos() {
  return await prisma.producto.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' }
  })
}

export async function createProducto(data: {
  nombre: string
  codigoBarras?: string
  precio?: number
  stock?: number
  costo?: number
  categoria?: string
  unidadMedida?: string
  tamanioEnvase?: number | null
  vendiblePorUnidad?: boolean
  cantidadEnvases?: number
  imagenData?: string | null
}) {
  // Check unique barcode
  if (data.codigoBarras) {
    const existing = await prisma.producto.findUnique({
      where: { codigoBarras: data.codigoBarras }
    })
    if (existing && existing.activo) {
      throw new Error('Ya existe un producto con este código de barras')
    }
  }

  // Calcular stock real según unidad de medida
  let stockReal = data.stock ?? 0

  if (data.unidadMedida && data.unidadMedida !== 'unidad' && data.tamanioEnvase && data.cantidadEnvases != null) {
    // ml o gr: stock = cantidadEnvases × tamañoEnvase
    stockReal = data.cantidadEnvases * data.tamanioEnvase
  }

  if (stockReal < 0) throw new Error('El stock no puede ser negativo')

  let imagenPath: string | null = null
  if (data.imagenData) {
    const { saveImage } = await import('./imageService')
    imagenPath = await saveImage(data.imagenData)
  }

  return await prisma.producto.create({
    data: {
      nombre: data.nombre,
      codigoBarras: data.codigoBarras || null,
      precio: data.precio ?? 0,
      stock: stockReal,
      costo: data.costo ?? 0,
      categoria: data.categoria,
      unidadMedida: data.unidadMedida ?? 'unidad',
      tamanioEnvase: data.tamanioEnvase ?? null,
      vendiblePorUnidad: data.vendiblePorUnidad ?? true,
      imagen: imagenPath
    }
  })
}

export async function updateProducto(
  id: string,
  data: {
    nombre?: string
    codigoBarras?: string
    precio?: number
    stock?: number
    costo?: number
    categoria?: string
    activo?: boolean
    unidadMedida?: string
    tamanioEnvase?: number | null
    vendiblePorUnidad?: boolean
    cantidadEnvases?: number
    imagenData?: string | null
  }
) {
  // Check unique barcode
  if (data.codigoBarras) {
    const existing = await prisma.producto.findUnique({
      where: { codigoBarras: data.codigoBarras }
    })
    if (existing && existing.id !== id && existing.activo) {
      throw new Error('Ya existe un producto con este código de barras')
    }
  }

  // Si envían cantidadEnvases + tamanioEnvase, recalcular stock
  const updateData: any = { ...data }
  delete updateData.cantidadEnvases
  
  // Convert empty string to null for codigoBarras if needed, but since it's optional string, we can just use it
  if (updateData.codigoBarras === "") {
    updateData.codigoBarras = null
  }

  if (data.cantidadEnvases != null && data.tamanioEnvase != null) {
    updateData.stock = data.cantidadEnvases * data.tamanioEnvase
  }

  if (data.imagenData === null) {
    // Delete explicit
    const old = await prisma.producto.findUnique({ where: { id }, select: { imagen: true } })
    if (old?.imagen) {
      const { deleteImage } = await import('./imageService')
      await deleteImage(old.imagen)
    }
    updateData.imagen = null
  } else if (data.imagenData) {
    // Replace with new image
    const old = await prisma.producto.findUnique({ where: { id }, select: { imagen: true } })
    const { saveImage, deleteImage } = await import('./imageService')
    const newPath = await saveImage(data.imagenData)
    if (old?.imagen) {
      await deleteImage(old.imagen)
    }
    updateData.imagen = newPath
  }
  
  delete updateData.imagenData

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
