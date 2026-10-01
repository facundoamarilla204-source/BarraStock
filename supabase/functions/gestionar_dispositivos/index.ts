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

    const { accion, email, machine_id, target_machine_id } = await req.json()

    if (!email || !machine_id || !accion) {
      throw new Error('Faltan datos requeridos (email, machine_id, accion)')
    }

    // 1. Obtener la licencia y validar al usuario
    const { data: licenciaData, error: licError } = await supabaseAdmin
      .from('licencias')
      .select('user_id, clientes!inner(email)')
      .eq('clientes.email', email)
      .single()

    const licencia = licenciaData ? { user_id: licenciaData.user_id } : null

    if (licError || !licencia || !licencia.user_id) {
      throw new Error('Licencia o usuario no encontrados')
    }

    const userId = licencia.user_id

    // 2. Verificar que el dispositivo que hace la petición está activo y pertenece al usuario
    const { data: currentDevice, error: devError } = await supabaseAdmin
      .from('dispositivos_activos')
      .select('estado')
      .eq('user_id', userId)
      .eq('machine_id', machine_id)
      .single()

    if (devError || !currentDevice || currentDevice.estado !== 'activo') {
      throw new Error('Dispositivo no autorizado o revocado')
    }

    // 3. Ejecutar la acción solicitada
    if (accion === 'listar') {
      const { data: dispositivos, error: listError } = await supabaseAdmin
        .from('dispositivos_activos')
        .select('*')
        .eq('user_id', userId)
        .order('ultimo_acceso', { ascending: false })

      if (listError) throw new Error('Error al listar dispositivos')

      return new Response(
        JSON.stringify({ success: true, dispositivos }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } 
    
    else if (accion === 'revocar') {
      if (!target_machine_id) {
        throw new Error('Se requiere target_machine_id para revocar')
      }

      const { error: revokeError } = await supabaseAdmin
        .from('dispositivos_activos')
        .update({ estado: 'revocado' })
        .eq('user_id', userId)
        .eq('machine_id', target_machine_id)

      if (revokeError) throw new Error('Error al revocar el dispositivo')

      return new Response(
        JSON.stringify({ success: true, mensaje: 'Dispositivo revocado exitosamente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Acción no válida')

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
