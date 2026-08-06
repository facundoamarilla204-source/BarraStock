import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, KeyRound } from 'lucide-react'

const formSchema = z.object({
  email: z.string().email('Email inválido'),
  codigo: z.string().min(4, 'Código muy corto')
})

/**
 * Pantalla de activación / bloqueo de licencia.
 *
 * Dos modos (recibidos vía location.state.modo):
 *   - 'activar' (default): primera vez, formulario email + código.
 *   - 'bloqueada': la licencia venció y se agotó la gracia.
 *     Muestra mensaje explicativo + botón "Reintentar chequeo".
 */
export function ActivacionScreen() {
  const location = useLocation()
  const modo: 'activar' | 'bloqueada' = (location.state as any)?.modo || 'activar'

  if (modo === 'bloqueada') {
    return <PantallaBloqueo />
  }

  return <PantallaActivacion />
}

// ─── Pantalla de ACTIVACIÓN INICIAL ─────────────────────────

function PantallaActivacion() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: { email: '', codigo: '' }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    setError(null)

    try {
      const res = await (window as any).api.activarLicencia(values.email, values.codigo)

      if (res.success) {
        navigate('/', { replace: true })
      } else {
        setError(res.error || 'Error desconocido al validar licencia.')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-600/10 flex items-center justify-center">
            <KeyRound className="h-7 w-7 text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-100">Activá BarraStock</CardTitle>
          <CardDescription className="text-gray-400">
            Ingresá tu email y el código de activación que recibiste por mail.
            Este paso requiere conexión a internet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-400 bg-red-500/10 rounded-md border border-red-500/20 text-center">
                  {error}
                </div>
              )}

              <FormField
                control={form.control as any}
                name="email"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Email de registro</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="tu@email.com"
                        {...field}
                        className="bg-gray-950 border-gray-800 text-gray-100"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="codigo"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Código de Activación</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="BS-..."
                        {...field}
                        className="bg-gray-950 border-gray-800 text-gray-100"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6"
                disabled={loading}
              >
                {loading ? 'Validando...' : 'Activar Licencia'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Pantalla de BLOQUEO (licencia vencida + gracia agotada) ──

function PantallaBloqueo() {
  const [checking, setChecking] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  async function reintentar() {
    setChecking(true)
    setMensaje(null)

    try {
      await (window as any).api.verificarRenovacionSilenciosa()
      const estado = await (window as any).api.verificarEstadoLocal()

      if (estado === 'activa' || estado === 'gracia') {
        // Licencia renovada → recargar app
        window.location.reload()
      } else {
        setMensaje('La licencia sigue sin renovar. Comprá o renová tu licencia en barrastock.com y volvé a intentar.')
      }
    } catch (err: any) {
      setMensaje('No se pudo conectar al servidor. Verificá tu conexión a internet e intentá de nuevo.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-100">Licencia vencida</CardTitle>
          <CardDescription className="text-gray-400 leading-relaxed">
            Tu licencia de BarraStock venció y se agotó el período de gracia.
            Para seguir usando el sistema, renová tu licencia en{' '}
            <span className="text-blue-400 font-medium">barrastock.com</span>{' '}
            y después presioná "Reintentar" con conexión a internet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mensaje && (
            <div className="p-3 text-sm text-yellow-400 bg-yellow-500/10 rounded-md border border-yellow-500/20 text-center">
              {mensaje}
            </div>
          )}

          <Button
            onClick={reintentar}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6"
            disabled={checking}
          >
            {checking ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Chequeando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar chequeo
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
