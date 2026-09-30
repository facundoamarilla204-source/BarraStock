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
  const [modoManual, setModoManual] = useState<'activar' | 'recuperar' | 'bloqueada' | null>(null)
  const modoInicial = (location.state as any)?.modo || 'activar'
  
  const modoActual = modoManual || modoInicial

  if (modoActual === 'bloqueada') {
    return <PantallaBloqueo onActivarNueva={() => setModoManual('activar')} />
  }

  if (modoActual === 'recuperar') {
    return <PantallaRecuperacion onVolver={() => setModoManual('activar')} />
  }

  return <PantallaActivacion onIrARecuprar={() => setModoManual('recuperar')} />
}

// ─── Pantalla de ACTIVACIÓN INICIAL ─────────────────────────

function PantallaActivacion({ onIrARecuprar }: { onIrARecuprar: () => void }) {
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
      const res = await (window as any).api.activarLicencia(values.codigo, values.email)

      if (res.success) {
        navigate('/', { replace: true })
      } else {
        setError(res.message || res.error || 'Error desconocido al validar licencia.')
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

              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={onIrARecuprar}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors bg-transparent border-none cursor-pointer"
                >
                  ¿Ya tenés licencia? Iniciar sesión con un código único
                </button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Pantalla de RECUPERACIÓN (Cambio de PC) ─────────────────────────

function PantallaRecuperacion({ onVolver }: { onVolver: () => void }) {
  const [paso, setPaso] = useState<'solicitar' | 'confirmar'>('solicitar')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'exito', texto: string } | null>(null)
  const navigate = useNavigate()

  async function handleSolicitar(e: React.FormEvent) {
    e.preventDefault()
    if (!email) {
      setMensaje({ tipo: 'error', texto: 'El email es obligatorio' })
      return
    }

    setLoading(true)
    setMensaje(null)
    try {
      const res = await (window as any).api.solicitarRecuperacionLicencia(email)
      if (res.error) throw new Error(res.error)
      
      setMensaje({ tipo: 'exito', texto: res.message || 'Código enviado si el email es válido.' })
      setPaso('confirmar')
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Ocurrió un error.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmar(e: React.FormEvent) {
    e.preventDefault()
    if (!codigo) {
      setMensaje({ tipo: 'error', texto: 'El código es obligatorio' })
      return
    }

    setLoading(true)
    setMensaje(null)
    try {
      const res = await (window as any).api.confirmarRecuperacionLicencia(email, codigo)
      if (res.error) throw new Error(res.error)
      
      navigate('/', { replace: true })
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Código inválido o vencido.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-600/10 flex items-center justify-center">
            <RefreshCw className="h-7 w-7 text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-100">Recuperar Licencia</CardTitle>
          <CardDescription className="text-gray-400">
            {paso === 'solicitar' 
              ? 'Ingresá el email con el que compraste tu licencia para enviarte un código.' 
              : 'Ingresá el código de 6 dígitos que te enviamos por correo.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mensaje && (
            <div className={`p-3 mb-4 text-sm rounded-md border text-center ${
              mensaje.tipo === 'error' 
                ? 'text-red-400 bg-red-500/10 border-red-500/20' 
                : 'text-green-400 bg-green-500/10 border-green-500/20'
            }`}>
              {mensaje.texto}
            </div>
          )}

          {paso === 'solicitar' ? (
            <form onSubmit={handleSolicitar} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-300">Email de registro</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="bg-gray-950 border-gray-800 text-gray-100"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6"
                disabled={loading}
              >
                {loading ? 'Enviando...' : 'Enviar Código'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleConfirmar} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-300">Código de Confirmación</label>
                <Input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="123456"
                  className="bg-gray-950 border-gray-800 text-gray-100 text-center tracking-widest text-xl font-mono"
                  maxLength={6}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6"
                disabled={loading}
              >
                {loading ? 'Validando...' : 'Confirmar y Activar'}
              </Button>
            </form>
          )}

          <div className="pt-6 text-center">
            <button
              type="button"
              onClick={onVolver}
              className="text-sm text-gray-500 hover:text-gray-400 transition-colors bg-transparent border-none cursor-pointer"
            >
              Volver a Activación
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Pantalla de BLOQUEO (licencia vencida + gracia agotada) ──

function PantallaBloqueo({ onActivarNueva }: { onActivarNueva: () => void }) {
  const [checking, setChecking] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [venceDate, setVenceDate] = useState<string | null>(null)

  const navigate = useNavigate()

  // Fetch fecha_vencimiento
  useState(() => {
    (window as any).api.getConfiguracion().then((config: any) => {
      if (config?.licenciaVence) {
        setVenceDate(new Date(config.licenciaVence).toLocaleDateString())
      }
    })
  })

  async function reintentar() {
    setChecking(true)
    setMensaje(null)

    try {
      await (window as any).api.verificarRenovacionSilenciosa()
      const estado = await (window as any).api.verificarEstadoLocal()

      if (estado === 'activa' || estado === 'gracia') {
        // Licencia renovada → redirigir a raíz para que AuthGuard tome el control
        navigate('/', { replace: true })
      } else {
        setMensaje('La licencia sigue sin renovar. Comprá o renová tu licencia en https://barrastock-two.vercel.app/ y volvé a intentar.')
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
            {venceDate ? `Tu licencia de BarraStock venció el ${venceDate} y se agotó el período de gracia.` : 'Tu licencia de BarraStock venció y se agotó el período de gracia.'}
            <br />
            Para seguir usando el sistema, renová tu licencia en{' '}
            <a href="https://barrastock-two.vercel.app/" target="_blank" rel="noreferrer" className="text-blue-400 font-medium hover:underline">
              barrastock-two.vercel.app
            </a>
            {' '}y después presioná "Reintentar chequeo".
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
                Reintentar chequeo (mismo email)
              </>
            )}
          </Button>

          <div className="pt-4 text-center">
            <button
              type="button"
              onClick={onActivarNueva}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors bg-transparent border-none cursor-pointer"
            >
              ¿Compraste una nueva licencia? Ingresá el código acá
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
