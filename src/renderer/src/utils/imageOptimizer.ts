export async function optimizeImage(file: File): Promise<{
  base64: string
  originalSize: number
  optimizedSize: number
}> {
  const MAX_SIZE = 5 * 1024 * 1024 // 5MB
  if (file.size > MAX_SIZE) {
    throw new Error('La imagen seleccionada es demasiado grande. Elegí una imagen de hasta 5 MB.')
  }

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    throw new Error('Formato no permitido. Solo se aceptan JPG, PNG o WEBP.')
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('No se pudo crear el contexto del canvas'))
          return
        }

        // Calculate new dimensions (max 1200x1200px)
        const MAX_WIDTH = 1200
        const MAX_HEIGHT = 1200
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width)
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height)
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        const quality = 0.85 // 85% quality
        const dataUrl = canvas.toDataURL('image/webp', quality)
        
        // Calculate size of base64
        const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1)
        const padding = (dataUrl.charAt(dataUrl.length - 2) === '=') ? 2 : ((dataUrl.charAt(dataUrl.length - 1) === '=') ? 1 : 0)
        const optimizedSize = (base64Length * 0.75) - padding

        resolve({
          base64: dataUrl,
          originalSize: file.size,
          optimizedSize: optimizedSize
        })
      }
      img.onerror = () => reject(new Error('Error al cargar la imagen'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsDataURL(file)
  })
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
