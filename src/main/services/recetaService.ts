import { prisma } from './db'

export async function getRecetas() {
  return await prisma.receta.findMany({
    where: { activa: true },
    include: {
      items: {
        include: {
          producto: true
        }
      }
    },
    orderBy: { nombre: 'asc' }
  })
}

export type RecetaItemCreateInput = {
  productoId: string
  cantidad: number
  unidad: string
}

export async function createReceta(data: {
  nombre: string
  categoria: string
  precio: number
  items: RecetaItemCreateInput[]
}) {
  // Validaciones
  for (const item of data.items) {
    if (!item.productoId) {
      throw new Error('Cada ítem de la receta debe referenciar un producto.')
    }
    if (item.cantidad <= 0) {
      throw new Error('La cantidad de un ítem debe ser mayor a 0.')
    }
  }

  return await prisma.receta.create({
    data: {
      nombre: data.nombre,
      categoria: data.categoria,
      precio: data.precio,
      items: {
        create: data.items
      }
    },
    include: {
      items: {
        include: {
          producto: true
        }
      }
    }
  })
}

export async function deleteReceta(id: string) {
  // Soft delete
  return await prisma.receta.update({
    where: { id },
    data: { activa: false }
  })
}

export async function updateReceta(id: string, data: { nombre: string; categoria: string; precio: number; items: RecetaItemCreateInput[] }) {
  for (const item of data.items) {
    if (!item.productoId) {
      throw new Error("Cada ítem de la receta debe referenciar un producto.");
    }
    if (item.cantidad <= 0) {
      throw new Error("La cantidad de un ítem debe ser mayor a 0.");
    }
  }
  return await prisma.receta.update({
    where: { id },
    data: {
      nombre: data.nombre,
      categoria: data.categoria,
      precio: data.precio,
      items: {
        deleteMany: {},
        create: data.items
      }
    },
    include: {
      items: {
        include: {
          producto: true
        }
      }
    }
  });
}
