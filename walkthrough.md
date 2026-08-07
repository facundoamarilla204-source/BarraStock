# Update: UI de Backup Agregada

Se ha implementado con éxito la interfaz de usuario para el sistema de copias de seguridad en la pantalla de **Configuración**. 

## Cambios Realizados
- **shadcn/ui Alert Dialog**: Se instaló el componente para proveer un popup nativo y destructivo ("¿Estás seguro?") para evitar restauraciones accidentales.
- **ConfiguracionScreen.tsx**: Se agregaron los botones de **Hacer copia de seguridad** y **Restaurar copia de seguridad**. 
- **Flujo IPC Integrado**: La interfaz ahora llama correctamente a las funciones de `(window as any).api.backupDatabase()` y `restoreDatabase()`.

## Próximo Paso: Verificación Manual
La tarea **NO está terminada**. Necesitamos realizar los 6 puntos obligatorios de validación con datos reales. 
Por favor, abrí la aplicación (`npm run dev`) y realizá la siguiente prueba:

1. **Hacer backup**: Ve a Configuración y creá un backup. Verificá que el archivo guardado pesa más de 0 bytes y termina en `.db`.
2. **Modificar estado**: Alterá algún producto, stock, o configuración en la app.
3. **Restaurar backup**: Volvé a Configuración y restaurá el archivo anterior. 
4. **Comprobación**: Confirmá que la app se reinicia sola y el estado vuelve exactamente a como estaba.
5. **Archivo Inválido**: Creá un archivo `.txt`, escribí cualquier cosa, cambiale la extensión a `.db` e intentá restaurarlo. La app debería rechazarlo mostrando un mensaje de error sin crashear.
6. **Cancelar Diálogo**: Hacé click en "Hacer copia" o "Restaurar", y simplemente cerrá la ventana de Windows (Cancelar). La app no debe crashear.

Avisame cómo resulta la prueba o si hay algún problema.
