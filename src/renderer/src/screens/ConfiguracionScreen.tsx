import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useLicenciaEstado } from '../App'

const formSchema = z.object({
  nombreNegocio: z.string().min(1, 'Obligatorio'),
  moneda: z.string().min(1, 'Obligatorio'),
  ivaActivo: z.boolean(),
  ivaPorcentaje: z.coerce.number().min(0, 'No puede ser negativo').default(21),
  porcentajeAlertaStock: z.coerce.number().min(0, 'No puede ser negativo')
})

export function ConfiguracionScreen() {
  const estadoGlobal = useLicenciaEstado()
  const [licencia, setLicencia] = useState<any>(null)
  const [appVersion, setAppVersion] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [licenciaLoading, setLicenciaLoading] = useState(false)
  const [licenciaCodigo, setLicenciaCodigo] = useState('')
  const [licenciaEmail, setLicenciaEmail] = useState('')

  const [updateStatus, setUpdateStatus] = useState<'idle' | 'loading' | 'up-to-date' | 'downloading' | 'error'>('idle')
  const [updateMessage, setUpdateMessage] = useState('')
  const [backupLoading, setBackupLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      nombreNegocio: '',
      moneda: 'ARS',
      ivaActivo: false,
      ivaPorcentaje: 21,
      porcentajeAlertaStock: 10
    }
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const config = await (window as any).api.getConfiguracion()
      if ((window as any).api.getVersion) {
        const version = await (window as any).api.getVersion()
        setAppVersion(version)
      }
      if (config) {
        form.reset({
          nombreNegocio: config.nombreNegocio,
          moneda: config.moneda,
          ivaActivo: config.ivaActivo,
          ivaPorcentaje: config.ivaPorcentaje ?? 21,
          porcentajeAlertaStock: config.porcentajeAlertaStock
        })
        setLicencia({
          licenciaEstado: config.licenciaEstado,
          licenciaVence: config.licenciaVence,
          licenciaEmail: config.licenciaEmail
        })
        if (config.licenciaEmail) {
          setLicenciaEmail(config.licenciaEmail)
        }
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await (window as any).api.updateConfiguracion(values)
      alert('Configuración guardada exitosamente')
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleActivarLicencia = async () => {
    if (!licenciaCodigo || !licenciaEmail) {
      alert('Debes ingresar el Email y el Código de Activación')
      return
    }

    try {
      setLicenciaLoading(true)
      const res = await (window as any).api.activarLicencia(licenciaCodigo, licenciaEmail)
      if (res.success) {
        alert('Licencia activada/verificada correctamente. La aplicación se recargará para aplicar los cambios.')
        window.location.reload()
      } else {
        alert('Error: ' + res.message)
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLicenciaLoading(false)
    }
  }

  const handleCheckUpdates = async () => {
    try {
      setUpdateStatus('loading')
      setUpdateMessage('Buscando actualizaciones...')
      
      const res = await (window as any).api.checkUpdates()
      
      if (!res.success || res.status === 'error' || res.status === 'rate_limit') {
        setUpdateStatus('error')
        if (res.status === 'rate_limit') {
          setUpdateMessage('No se pudo verificar en este momento (límite temporal alcanzado). Probá de nuevo en un rato.')
        } else {
          setUpdateMessage('No se pudo verificar. Revisá tu conexión a internet.')
        }
        return
      }

      setUpdateStatus(res.status)
      if (res.status === 'up-to-date') {
        setUpdateMessage(`Ya tenés la última versión (v${appVersion || res.version || 'actual'})`)
      } else if (res.status === 'downloading') {
        setUpdateMessage(`Hay una actualización disponible (v${res.version}). Descargando en segundo plano...`)
      }
    } catch (error) {
      setUpdateStatus('error')
      setUpdateMessage('Ocurrió un error al verificar actualizaciones.')
    }
  }

  const handleBackup = async () => {
    try {
      setBackupLoading(true)
      const res = await (window as any).api.backupDatabase()
      if (res.success && res.path) {
        alert(`Copia de seguridad guardada exitosamente en:\n${res.path}`)
      } else if (!res.success && res.message !== 'Operación cancelada') {
        alert('Error: ' + res.message)
      }
    } catch (e: any) {
      alert('Error inesperado: ' + e.message)
    } finally {
      setBackupLoading(false)
    }
  }

  const handleRestore = async () => {
    try {
      setBackupLoading(true)
      const res = await (window as any).api.restoreDatabase()
      if (res.success) {
        alert('Copia restaurada exitosamente. La aplicación se cerrará/reiniciará ahora para aplicar los cambios.')
      } else if (!res.success && res.message !== 'Operación cancelada') {
        alert('Error: ' + res.message)
      }
    } catch (e: any) {
      alert('Error inesperado: ' + e.message)
    } finally {
      setBackupLoading(false)
    }
  }

  if (loading) return <div className="p-4 text-gray-400">Cargando...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Configuración del Negocio</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Ajustes Generales */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Ajustes Generales</CardTitle>
            <CardDescription className="text-gray-400">Información básica y preferencias del sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                <FormField
                  control={form.control as any}
                  name="nombreNegocio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Negocio</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Bar Central" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="moneda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moneda</FormLabel>
                      <FormControl>
                        <Input disabled {...field} />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Por el momento solo soportamos ARS.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="porcentajeAlertaStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Umbral de Stock Bajo</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Cantidad mínima antes de mostrar la alerta en el Dashboard.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="ivaActivo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-800 p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Control de IVA</FormLabel>
                        <FormDescription className="text-gray-500">
                          Aplicar recargo de IVA a las ventas automáticamente.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('ivaActivo') && (
                  <FormField
                    control={form.control as any}
                    name="ivaPorcentaje"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Porcentaje de IVA (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          Se sumará este porcentaje al precio de todos los productos y recetas.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Guardar Configuración
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Licencia */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Licencia del Software</CardTitle>
            <CardDescription className="text-gray-400">Información de tu licencia activa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="font-medium text-gray-300">Estado Actual</span>
              <Badge variant={estadoGlobal === 'activa' ? 'default' : 'destructive'}>
                {estadoGlobal?.toUpperCase() || 'DESCONOCIDO'}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="font-medium text-gray-300">Email Registrado</span>
              <span className="text-gray-400">{licencia?.licenciaEmail || 'N/A'}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="font-medium text-gray-300">Vencimiento</span>
              <span className="text-gray-400">
                {licencia?.licenciaVence ? new Date(licencia.licenciaVence).toLocaleDateString() : 'Nunca'}
              </span>
            </div>
            
            <div className="pt-4 space-y-6">
              <div className="space-y-2">
                <span className="font-medium text-sm text-gray-300">¿Renovaste tu licencia actual vía web?</span>
                <p className="text-xs text-gray-500">Si pagaste la renovación de este mismo email, hacé clic abajo para actualizar el estado.</p>
                <Button 
                  variant="outline"
                  onClick={async () => {
                    setLicenciaLoading(true)
                    try {
                      const oldConfig = await (window as any).api.getConfiguracion()
                      const nuevoEstado = await (window as any).api.verificarRenovacionSilenciosa()
                      const newConfig = await (window as any).api.getConfiguracion()
                      
                      if (nuevoEstado) {
                        const oldDate = oldConfig?.licenciaVence ? new Date(oldConfig.licenciaVence).getTime() : 0
                        const newDate = newConfig?.licenciaVence ? new Date(newConfig.licenciaVence).getTime() : 0
                        const isDateChanged = oldDate !== newDate
                        
                        if (isDateChanged && nuevoEstado === 'activa') {
                          alert('¡Renovación detectada exitosamente! Tu licencia ahora es ACTIVA. La pantalla se actualizará.')
                          window.location.reload()
                        } else if (nuevoEstado === 'activa') {
                          alert('Tu licencia ya figura como ACTIVA. No se detectaron nuevos vencimientos.')
                        } else if (nuevoEstado === 'gracia') {
                          alert('Tu licencia se encuentra en PERÍODO DE GRACIA. Recordá renovarla vía web para evitar interrupciones.')
                        } else if (nuevoEstado === 'bloqueada') {
                          alert('La licencia figura como BLOQUEADA. Si ya abonaste la renovación, puede demorar unos minutos en procesarse. Intentá nuevamente en breve.')
                        } else {
                          alert(`Estado verificado: ${nuevoEstado.toUpperCase()}.`)
                        }
                      } else {
                        alert('No se pudo establecer conexión con el servidor o no hubo respuesta. Verificá tu internet.')
                      }
                    } catch (e: any) {
                      alert('Ocurrió un error inesperado al verificar: ' + e.message)
                    } finally {
                      setLicenciaLoading(false)
                    }
                  }}
                  disabled={licenciaLoading}
                  className="w-full border-gray-700 hover:bg-gray-800 text-gray-200"
                >
                  {licenciaLoading ? 'Verificando...' : 'Verificar estado ahora'}
                </Button>
              </div>

              <div className="border-t border-gray-800 pt-4 space-y-4">
                <div>
                  <span className="font-medium text-sm text-gray-300">Activar nuevo código</span>
                  <p className="text-xs text-gray-500">Si recibiste un nuevo código de activación para esta cuenta, ingresalo acá.</p>
                </div>
                <div className="space-y-2">
                  <Input 
                    placeholder="Tu Email" 
                    value={licenciaEmail}
                    disabled
                    className="bg-gray-950 border-gray-800 opacity-50 cursor-not-allowed"
                  />
                  <div className="flex gap-2">
                    <Input 
                      placeholder="BS-..." 
                      value={licenciaCodigo}
                      onChange={(e) => setLicenciaCodigo(e.target.value)}
                      className="bg-gray-950 border-gray-800"
                    />
                    <Button 
                      onClick={handleActivarLicencia}
                      disabled={licenciaLoading || !licenciaCodigo || !licenciaEmail} 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {licenciaLoading ? 'Validando...' : 'Activar'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Copia de Seguridad */}
        <Card className="bg-gray-900 border-gray-800 md:col-span-2">
          <CardHeader>
            <CardTitle>Copia de Seguridad</CardTitle>
            <CardDescription className="text-gray-400">
              Respaldar o restaurar todos los datos (productos, ventas, configuración).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 border border-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-gray-200 mb-2">Hacer una copia de seguridad</h3>
              <p className="text-sm text-gray-500 mb-4">
                Se guardará un archivo con toda tu información en la carpeta que elijas. Recomendamos hacer esto periódicamente y guardarlo en un pendrive o en la nube.
              </p>
              <Button 
                onClick={handleBackup} 
                disabled={backupLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {backupLoading ? 'Procesando...' : 'Hacer copia de seguridad'}
              </Button>
            </div>
            
            <div className="flex-1 border border-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-gray-200 mb-2">Restaurar copia de seguridad</h3>
              <p className="text-sm text-gray-500 mb-4">
                Permite cargar un archivo de backup previamente guardado. Utilizalo si tuviste un problema o cambiaste de computadora.
              </p>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={backupLoading}>
                    Restaurar copia de seguridad
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-gray-900 border-gray-800 text-gray-200">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-400">¿Estás completamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      Esto va a reemplazar TODOS los datos actuales de BarraStock por los de la copia seleccionada. Los datos actuales se perderán irremediablemente. Esta acción no se puede deshacer. ¿Confirmás que querés continuar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-gray-800 text-white hover:bg-gray-700 hover:text-white border-0">
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleRestore}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Sí, restaurar datos
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Sistema y Actualizaciones */}
        <Card className="bg-gray-900 border-gray-800 md:col-span-2">
          <CardHeader>
            <CardTitle>Sistema</CardTitle>
            <CardDescription className="text-gray-400">Actualizaciones y mantenimiento.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-300 font-medium">Versión Actual: v{appVersion}</p>
              {updateMessage && (
                <p className={`text-sm mt-1 ${updateStatus === 'error' ? 'text-red-400' : updateStatus === 'up-to-date' ? 'text-green-400' : 'text-blue-400'}`}>
                  {updateMessage}
                </p>
              )}
            </div>
            <Button 
              onClick={handleCheckUpdates}
              disabled={updateStatus === 'loading' || updateStatus === 'downloading'}
              variant="outline"
              className="border-gray-700 hover:bg-gray-800 text-gray-200"
            >
              {updateStatus === 'loading' ? 'Buscando...' : 'Buscar actualizaciones'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-sm text-gray-600 pt-4 pb-8">
        BarraStock {appVersion ? `v${appVersion}` : ''} - Facundo Amarilla
      </div>
    </div>
  )
}
