import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import crypto from 'crypto'

export function getImagesDir(): string {
  // Always use userData/images/products to store product images so they persist and can be backed up
  const dir = path.join(app.getPath('userData'), 'images', 'products')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export async function saveImage(base64Data: string): Promise<string> {
  const dir = getImagesDir()
  const uuid = crypto.randomUUID()
  const fileName = `product-${uuid}.webp`
  const filePath = path.join(dir, fileName)
  
  // Remove the data:image/webp;base64, part if present
  const base64Image = base64Data.split(';base64,').pop()
  if (!base64Image) {
    throw new Error('Formato de imagen inválido')
  }

  const buffer = Buffer.from(base64Image, 'base64')
  await fs.promises.writeFile(filePath, buffer)
  
  return fileName
}

export async function deleteImage(fileName: string): Promise<void> {
  try {
    const filePath = path.join(getImagesDir(), fileName)
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath)
    }
  } catch (err) {
    console.error('Error al borrar imagen:', err)
  }
}
