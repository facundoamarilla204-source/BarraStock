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

const formSchema = z.object({
  nombreNegocio: z.string().min(1, 'Obligatorio'),
  moneda: z.string().min(1, 'Obligatorio'),
  ivaActivo: z.boolean(),
  ivaPorcentaje: z.coerce.number().min(0, 'No puede ser negativo').default(21),
  porcentajeAlertaStock: z.coerce.number().min(0, 'No puede ser negativo')
})

export function ConfiguracionScreen() {
  const [licencia, setLicencia] = useState<any>(null)
  const [appVersion, setAppVersion] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [licenciaLoading, setLicenciaLoading] = useState(false)
  const [licenciaCodigo, setLicenciaCodigo] = useState('')
  const [licenciaEmail, setLicenciaEmail] = useState('')

  const [updateStatus, setUpdateStatus] = useState<'idle' | 'loading' | 'up-to-date' | 'downloading' | 'error'>('idle')
  const [updateMessage, setUpdateMessage] = useState('')

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
        alert('Licencia activada correctamente')
        await loadData() // Reload local license info
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
              <Badge variant={licencia?.licenciaEstado === 'activa' ? 'default' : 'destructive'}>
                {licencia?.licenciaEstado?.toUpperCase() || 'DESCONOCIDO'}
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
            
            {(licencia?.licenciaEstado === 'activa' || licencia?.licenciaEstado === 'gracia') ? (
              <div className="pt-4">
                <Button 
                  variant="outline"
                  onClick={async () => {
                    setLicenciaLoading(true)
                    try {
                      await (window as any).api.verificarRenovacionSilenciosa()
                      await loadData()
                      alert('Verificación completada')
                    } catch (e: any) {
                      alert('Error: ' + e.message)
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
            ) : (
              <div className="pt-4 space-y-4">
                <span className="font-medium text-sm text-gray-300">Activar o Renovar</span>
                <div className="space-y-2">
                  <Input 
                    placeholder="Tu Email" 
                    value={licenciaEmail}
                    onChange={(e) => setLicenciaEmail(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input 
                      placeholder="XXXX-XXXX-XXXX-XXXX" 
                      value={licenciaCodigo}
                      onChange={(e) => setLicenciaCodigo(e.target.value)}
                    />
                    <Button 
                      onClick={handleActivarLicencia}
                      disabled={licenciaLoading || !licenciaCodigo || !licenciaEmail} 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {licenciaLoading ? 'Verificando...' : 'Verificar'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
