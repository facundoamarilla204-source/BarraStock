import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { LogIn, Eye, EyeOff, KeyRound, ShieldCheck, WifiOff } from 'lucide-react'

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''

/**
 * Pantalla de Login.
 *
 * Modos:
 *  - 'login': Email + Contraseña (default)
 *  - 'migracion': Licencia legacy, pide crear contraseña
 *  - 'activar': Primer uso, pide email + contraseña + código de licencia
 */
export function LoginScreen() {
  const [modo, setModo] = useState<'login' | 'migracion' | 'activar'>('login')

  if (modo === 'migracion') {
    return <PantallaMigracion onVolver={() => setModo('login')} />
  }

  if (modo === 'activar') {
    return <PantallaActivar onVolver={() => setModo('login')} />
  }

  return <PantallaLogin onMigrar={() => setModo('migracion')} onActivar={() => setModo('activar')} />
}

// ─── Pantalla de LOGIN ────────────────────────────────────────

function PantallaLogin({ onMigrar, onActivar }: { onMigrar: () => void; onActivar: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offlineMode, setOfflineMode] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError(null)
    setOfflineMode(false)

    try {
      // 1. Intentar login online con Supabase Auth
      if (SUPABASE_URL && SUPABASE_KEY) {
        try {
          const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
          })

          if (authRes.ok) {
            const authData = await authRes.json()
            // Login online exitoso — registrar dispositivo
            const res = await (window as any).api.authLoginOnline(email, password, authData.access_token)
            if (res.success) {
              navigate('/', { replace: true })
              return
            } else {
              setError(res.message || 'Error al registrar dispositivo')
              setLoading(false)
              return
            }
          } else {
            // Credenciales incorrectas online
            if (authRes.status === 400) {
              setError('Email o contraseña incorrectos')
              setLoading(false)
              return
            }
            // Otro error de servidor — intentar offline
          }
        } catch {
          // Sin conexión — intentar offline
          setOfflineMode(true)
        }
      }

      // 2. Fallback: Login offline
      const res = await (window as any).api.authLoginLocal(email, password)
      if (res.success) {
        setOfflineMode(true)
        navigate('/', { replace: true })
        return
      }

      if (res.message === 'MIGRATION_REQUIRED') {
        onMigrar()
        return
      }

      setError(res.message || 'Credenciales incorrectas')
    } catch (err: any) {
      if (err.message === 'MIGRATION_REQUIRED') {
        onMigrar()
        return
      }
      setError(err.message || 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-600/10 flex items-center justify-center">
            <LogIn className="h-7 w-7 text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-100">Iniciar Sesión</CardTitle>
          <CardDescription className="text-gray-400">
            Ingresá tu email y contraseña para acceder a BarraStock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-500/10 rounded-md border border-red-500/20 text-center">
                {error}
              </div>
            )}

            {offlineMode && !error && (
              <div className="p-3 text-sm text-yellow-400 bg-yellow-500/10 rounded-md border border-yellow-500/20 text-center flex items-center justify-center gap-2">
                <WifiOff className="h-4 w-4" />
                Modo sin conexión
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="bg-gray-950 border-gray-800 text-gray-100"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Contraseña</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-gray-950 border-gray-800 text-gray-100 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 bg-transparent border-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6"
              disabled={loading || !email || !password}
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </Button>

            <div className="pt-4 space-y-2 text-center">
              <button
                type="button"
                onClick={onActivar}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors bg-transparent border-none cursor-pointer block mx-auto"
              >
                <KeyRound className="h-3.5 w-3.5 inline mr-1" />
                Primera vez? Activá tu licencia acá
              </button>
              <button
                type="button"
                onClick={onMigrar}
                className="text-sm text-gray-500 hover:text-gray-400 transition-colors bg-transparent border-none cursor-pointer block mx-auto"
              >
                <ShieldCheck className="h-3.5 w-3.5 inline mr-1" />
                Ya tenés licencia pero no tenés contraseña?
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Pantalla de MIGRACIÓN (licencia legacy sin contraseña) ────────

function PantallaMigracion({ onVolver }: { onVolver: () => void }) {
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  // Pre-cargar email de la licencia actual si existe
  useState(() => {
    ;(window as any).api.getConfiguracion().then((config: any) => {
      if (config?.licenciaEmail) setEmail(config.licenciaEmail)
      if (config?.licenciaCodigo) setCodigo(config.licenciaCodigo)
    })
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await (window as any).api.authMigrarCuenta(email, codigo, password)
      if (res.success) {
        navigate('/', { replace: true })
      } else {
        setError(res.message || 'Error al migrar la cuenta')
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
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-600/10 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-100">Configurar Contraseña</CardTitle>
          <CardDescription className="text-gray-400">
            Hemos mejorado la seguridad de BarraStock. Para continuar usando tu licencia, creá una contraseña para tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-500/10 rounded-md border border-red-500/20 text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email de tu licencia</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="bg-gray-950 border-gray-800 text-gray-100"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Código de Licencia</label>
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="BS-..."
                className="bg-gray-950 border-gray-800 text-gray-100"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Nueva Contraseña</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="bg-gray-950 border-gray-800 text-gray-100 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 bg-transparent border-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Confirmar Contraseña</label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetir contraseña"
                className="bg-gray-950 border-gray-800 text-gray-100"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-6"
              disabled={loading || !email || !codigo || !password || !confirmPassword}
            >
              {loading ? 'Creando cuenta...' : 'Crear Contraseña y Entrar'}
            </Button>

            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={onVolver}
                className="text-sm text-gray-500 hover:text-gray-400 transition-colors bg-transparent border-none cursor-pointer"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Pantalla de PRIMERA ACTIVACIÓN (nuevo usuario) ────────────

function PantallaActivar({ onVolver }: { onVolver: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [codigo, setCodigo] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || !codigo) return
    setLoading(true)
    setError(null)

    try {
      // Intentamos loguearnos con Supabase Auth
      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      if (!authRes.ok) {
        setError('Email o contraseña incorrectos. Usá las credenciales que recibiste por email.')
        setLoading(false)
        return
      }

      const authData = await authRes.json()

      // Activar licencia (como antes)
      const activacionRes = await (window as any).api.activarLicencia(codigo, email)
      if (!activacionRes.success) {
        setError(activacionRes.message || 'Error al activar la licencia')
        setLoading(false)
        return
      }

      // Registrar dispositivo
      const loginRes = await (window as any).api.authLoginOnline(email, password, authData.access_token)
      if (loginRes.success) {
        navigate('/', { replace: true })
      } else {
        setError(loginRes.message || 'Error al registrar dispositivo')
      }
    } catch (err: any) {
      setError('No se pudo conectar al servidor. Verificá tu conexión a internet.')
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
          <CardTitle className="text-2xl font-bold text-gray-100">Activar BarraStock</CardTitle>
          <CardDescription className="text-gray-400">
            Ingresá las credenciales y el código de licencia que recibiste por email. Este paso requiere conexión a internet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-500/10 rounded-md border border-red-500/20 text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="bg-gray-950 border-gray-800 text-gray-100"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Contraseña</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="La que recibiste por email"
                  className="bg-gray-950 border-gray-800 text-gray-100 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 bg-transparent border-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Código de Licencia</label>
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="BS-..."
                className="bg-gray-950 border-gray-800 text-gray-100"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6"
              disabled={loading || !email || !password || !codigo}
            >
              {loading ? 'Activando...' : 'Activar y Entrar'}
            </Button>

            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={onVolver}
                className="text-sm text-gray-500 hover:text-gray-400 transition-colors bg-transparent border-none cursor-pointer"
              >
                Ya tenés cuenta? Volver a Inicio de Sesión
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
