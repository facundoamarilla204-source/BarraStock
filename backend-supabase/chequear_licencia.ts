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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    
    // El cliente desde la app envía el token en los headers
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('No autorizado')

    const { machineId } = await req.json()
    if (!machineId) throw new Error('machineId es requerido')

    // 1. Validar estado del dispositivo
    const { data: dispositivo, error: dispError } = await supabaseAdmin
      .from('dispositivos_activos')
      .select('estado')
      .eq('user_id', user.id)
      .eq('machine_id', machineId)
      .single()

    if (dispError || !dispositivo) {
      throw new Error('Dispositivo no encontrado')
    }

    if (dispositivo.estado === 'revocado') {
      return new Response(
        JSON.stringify({ success: false, status: 'REVOCADO', error: 'Esta PC fue desconectada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Si el dispositivo es válido, traer datos de la licencia
    const { data: licencia, error: licError } = await supabaseAdmin
      .from('licencias')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (licError || !licencia) {
      throw new Error('Licencia no encontrada')
    }

    // Actualizamos el ultimo acceso
    await supabaseAdmin
      .from('dispositivos_activos')
      .update({ ultimo_acceso: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('machine_id', machineId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        fecha_vencimiento: licencia.fecha_vencimiento,
        estado_licencia: licencia.estado 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
