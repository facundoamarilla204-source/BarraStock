import { describe, it, expect } from 'vitest'
import { createProducto } from '../main/services/productoService'
import { createIngrediente } from '../main/services/ingredienteService'
import { createReceta } from '../main/services/recetaService'

describe('Validaciones de Datos (Fase 2)', () => {
  describe('Productos', () => {
    it('debe fallar al crear un producto con stock negativo', async () => {
      await expect(
        createProducto({ nombre: 'Coca Cola', precio: 1000, stock: -5 })
      ).rejects.toThrow('El stock no puede ser negativo')
    })
  })

  describe('Ingredientes', () => {
    it('debe fallar al crear un ingrediente con stock negativo', async () => {
      await expect(
        createIngrediente({ nombre: 'Fernet', unidad: 'ml', stock: -100 })
      ).rejects.toThrow('El stock no puede ser negativo')
    })
  })

  describe('Recetas', () => {
    it('debe fallar si un ítem no tiene productoId ni ingredienteId', async () => {
      await expect(
        createReceta({
          nombre: 'Trago Vacío',
          categoria: 'trago',
          precio: 2000,
          items: [
            { cantidad: 100, unidad: 'ml' } // Falta ID
          ]
        })
      ).rejects.toThrow('Cada ítem de la receta debe ser un ingrediente o un producto.')
    })

    it('debe fallar si un ítem tiene productoId e ingredienteId simultáneamente', async () => {
      await expect(
        createReceta({
          nombre: 'Trago Raro',
          categoria: 'trago',
          precio: 2000,
          items: [
            { ingredienteId: '1', productoId: '2', cantidad: 100, unidad: 'ml' }
          ]
        })
      ).rejects.toThrow('Un ítem de la receta no puede ser simultáneamente ingrediente y producto.')
    })

    it('debe fallar si un ítem tiene cantidad menor o igual a 0', async () => {
      await expect(
        createReceta({
          nombre: 'Trago Cero',
          categoria: 'trago',
          precio: 2000,
          items: [
            { ingredienteId: '1', cantidad: 0, unidad: 'ml' }
          ]
        })
      ).rejects.toThrow('La cantidad de un ítem debe ser mayor a 0.')
      
      await expect(
        createReceta({
          nombre: 'Trago Negativo',
          categoria: 'trago',
          precio: 2000,
          items: [
            { ingredienteId: '1', cantidad: -50, unidad: 'ml' }
          ]
        })
      ).rejects.toThrow('La cantidad de un ítem debe ser mayor a 0.')
    })
  })
})
