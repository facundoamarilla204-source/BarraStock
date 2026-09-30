import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Falta configuración de Supabase')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function main() {
  const email = 'fakuanillo59@gmail.com'
  const password = '654321'

  // Intentamos loguearnos primero por si ya existe con esa password
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  })

  if (signInData.user) {
    console.log(`El usuario ${email} ya existe en Supabase y la contraseña es correcta.`)
    return
  }

  // Si no existe, lo creamos
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: email,
    password: password
  })

  if (signUpError) {
    console.error('Error al registrar usuario en Supabase:', signUpError.message)
    // Es posible que ya exista pero con otra contraseña, y sin la clave de admin no podemos cambiarla directamente aquí.
  } else {
    console.log(`Usuario creado en Supabase con email ${email} y contraseña establecida a 654321`)
  }
}

main()
