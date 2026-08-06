import { prisma } from './db'

export async function runSeed() {
  const countProd = await prisma.producto.count()
  const countReceta = await prisma.receta.count()

  if (countProd > 0 || countReceta > 0) {
    return { success: false, message: 'La base de datos ya contiene datos. Operación abortada.' }
  }

  // Productos (ex-Ingredientes) — insumos de recetas
  const vodka = await prisma.producto.create({
    data: {
      nombre: 'Vodka Smirnoff 750ml',
      unidadMedida: 'ml',
      stock: 1500, // 2 botellas de 750ml
      tamanioEnvase: 750,
      vendiblePorUnidad: true,
      precio: 8000,
      costo: 5000,
      categoria: 'Bebidas Blancas'
    }
  })

  const fernet = await prisma.producto.create({
    data: {
      nombre: 'Fernet Branca 1L',
      unidadMedida: 'ml',
      stock: 14000, // 14 botellas de 1000ml
      tamanioEnvase: 1000,
      vendiblePorUnidad: true,
      precio: 12000,
      costo: 7000,
      categoria: 'Aperitivos'
    }
  })

  const gin = await prisma.producto.create({
    data: {
      nombre: 'Gin Bombay 750ml',
      unidadMedida: 'ml',
      stock: 1500, // 2 botellas
      tamanioEnvase: 750,
      vendiblePorUnidad: true,
      precio: 15000,
      costo: 9000,
      categoria: 'Bebidas Blancas'
    }
  })

  const jugoNaranja = await prisma.producto.create({
    data: {
      nombre: 'Jugo de Naranja Cepita 1L',
      unidadMedida: 'ml',
      stock: 3000,
      tamanioEnvase: 1000,
      vendiblePorUnidad: true,
      precio: 2000,
      costo: 1200,
      categoria: 'Jugos'
    }
  })

  const tonica = await prisma.producto.create({
    data: {
      nombre: 'Agua Tónica Paso de los Toros 1.5L',
      unidadMedida: 'ml',
      stock: 3000, // 2 botellas de 1500ml
      tamanioEnvase: 1500,
      vendiblePorUnidad: true,
      precio: 2500,
      costo: 1500,
      categoria: 'Gaseosas'
    }
  })

  const limon = await prisma.producto.create({
    data: {
      nombre: 'Limón fresco',
      unidadMedida: 'unidad',
      stock: 50,
      vendiblePorUnidad: false, // no se vende suelto en el POS
      precio: 0,
      costo: 50,
      categoria: 'Frutas'
    }
  })

  // Productos cerrados (venta directa)
  const cocaCola = await prisma.producto.create({
    data: {
      nombre: 'Coca Cola 2.25L',
      unidadMedida: 'unidad',
      stock: 20,
      vendiblePorUnidad: true,
      precio: 2500,
      costo: 1500,
      categoria: 'Gaseosas'
    }
  })

  await prisma.producto.create({
    data: {
      nombre: 'Sprite Lata 354ml',
      unidadMedida: 'unidad',
      stock: 40,
      vendiblePorUnidad: true,
      precio: 1200,
      costo: 700,
      categoria: 'Gaseosas'
    }
  })

  await prisma.producto.create({
    data: {
      nombre: 'Papas Lays 100g',
      unidadMedida: 'unidad',
      stock: 15,
      vendiblePorUnidad: true,
      precio: 1500,
      costo: 900,
      categoria: 'Snacks'
    }
  })

  await prisma.producto.create({
    data: {
      nombre: 'Cerveza Quilmes 1L',
      unidadMedida: 'unidad',
      stock: 50,
      vendiblePorUnidad: true,
      precio: 2000,
      costo: 1200,
      categoria: 'Cervezas'
    }
  })

  // Recetas (Tragos) — ahora referencian productoId
  await prisma.receta.create({
    data: {
      nombre: 'Destornillador',
      categoria: 'trago',
      precio: 3000,
      items: {
        create: [
          { productoId: vodka.id, cantidad: 50, unidad: 'ml' },
          { productoId: jugoNaranja.id, cantidad: 200, unidad: 'ml' }
        ]
      }
    }
  })

  await prisma.receta.create({
    data: {
      nombre: 'Gin Tonic',
      categoria: 'trago',
      precio: 4500,
      items: {
        create: [
          { productoId: gin.id, cantidad: 50, unidad: 'ml' },
          { productoId: tonica.id, cantidad: 200, unidad: 'ml' },
          { productoId: limon.id, cantidad: 0.5, unidad: 'unidad' }
        ]
      }
    }
  })

  // Recetas (Combos)
  await prisma.receta.create({
    data: {
      nombre: 'Combo Fernet + Coca + Hielo',
      categoria: 'combo',
      precio: 8500,
      items: {
        create: [
          { productoId: fernet.id, cantidad: 750, unidad: 'ml' },
          { productoId: cocaCola.id, cantidad: 1, unidad: 'unidad' }
        ]
      }
    }
  })

  return { success: true, message: 'Datos de prueba inyectados correctamente.' }
}
