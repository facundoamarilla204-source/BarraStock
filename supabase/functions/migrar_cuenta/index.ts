import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { email, codigo, password } = await req.json()
    if (!email || !codigo || !password) {
      throw new Error('Faltan datos requeridos')
    }

    // 1. Verificar la licencia legacy
    const { data: licencia, error: licError } = await supabaseAdmin
      .from('licencias')
      .select('*')
      .eq('email', email)
      .eq('codigo', codigo)
      .single()

    if (licError || !licencia) {
      throw new Error('Código de licencia o correo no encontrados / inválidos')
    }

    if (licencia.user_id) {
      throw new Error('Esta licencia ya está asociada a un usuario Auth')
    }

    // 2. Crear usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    })

    if (authError || !authUser.user) {
      // Si el error es que el usuario ya existe, lo buscamos para asociarlo
      if (authError?.message.includes('already registered')) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const found = existingUsers.users.find(u => u.email === email)
        if (found) {
          authUser.user = found
        } else {
          throw new Error('El usuario ya existe pero no pudo ser enlazado')
        }
      } else {
        throw new Error(authError?.message || 'Error al crear la cuenta')
      }
    }

    // 3. Asociar la licencia al usuario
    await supabaseAdmin
      .from('licencias')
      .update({ user_id: authUser.user.id })
      .eq('id', licencia.id)

    return new Response(
      JSON.stringify({ success: true, mensaje: 'Cuenta migrada y asociada correctamente.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
