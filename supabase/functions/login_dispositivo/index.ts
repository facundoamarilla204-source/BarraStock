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
    // Usamos el cliente normal pasandole el Auth Header del usuario
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    })
    
    // Usamos un service_role client para poder modificar tablas sin problemas si hace falta
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // 1. Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('No autorizado')

    const { machineId, nombreEquipo } = await req.json()
    if (!machineId) throw new Error('machineId es requerido')

    // 2. Verificar que tenga licencia activa
    const { data: licencia, error: licError } = await supabaseAdmin
      .from('licencias')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (licError || !licencia) {
      throw new Error('No se encontró una licencia vinculada a esta cuenta')
    }
    
    if (licencia.estado !== 'activa') {
      throw new Error('La licencia no está activa')
    }

    // 3. Obtener dispositivos activos actuales
    const { data: dispositivosActivos } = await supabaseAdmin
      .from('dispositivos_activos')
      .select('*')
      .eq('user_id', user.id)
      .eq('estado', 'activo')
      .order('ultimo_acceso', { ascending: true }) // El más viejo primero

    let esDispositivoNuevo = true
    const activos = dispositivosActivos || []

    const dispositivoActual = activos.find(d => d.machine_id === machineId)
    if (dispositivoActual) {
      // Ya estaba activo, solo actualizamos fecha
      esDispositivoNuevo = false
      await supabaseAdmin
        .from('dispositivos_activos')
        .update({ ultimo_acceso: new Date().toISOString(), nombre_equipo: nombreEquipo || dispositivoActual.nombre_equipo })
        .eq('id', dispositivoActual.id)
    }

    // 4. Si es nuevo, chequear limite
    if (esDispositivoNuevo) {
      const limite = licencia.limite_dispositivos || 1
      
      // Si la cantidad de activos (sin contar este porque es nuevo) >= limite
      // Revocamos los mas antiguos
      if (activos.length >= limite) {
        const cantidadARevocar = (activos.length + 1) - limite
        for (let i = 0; i < cantidadARevocar; i++) {
          const aRevocar = activos[i]
          await supabaseAdmin
            .from('dispositivos_activos')
            .update({ estado: 'revocado' })
            .eq('id', aRevocar.id)
        }
      }

      // Revisamos si el dispositivo ya existia (revocado) para actualizarlo o crear uno nuevo
      const { data: existente } = await supabaseAdmin
        .from('dispositivos_activos')
        .select('*')
        .eq('user_id', user.id)
        .eq('machine_id', machineId)
        .maybeSingle()

      if (existente) {
        await supabaseAdmin
          .from('dispositivos_activos')
          .update({ 
            estado: 'activo', 
            ultimo_acceso: new Date().toISOString(),
            nombre_equipo: nombreEquipo || existente.nombre_equipo
          })
          .eq('id', existente.id)
      } else {
        await supabaseAdmin
          .from('dispositivos_activos')
          .insert({
            user_id: user.id,
            machine_id: machineId,
            nombre_equipo: nombreEquipo || 'PC Desconocida',
            estado: 'activo'
          })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        fecha_vencimiento: licencia.fecha_vencimiento,
        codigo_activacion: licencia.codigo_activacion,
        mensaje: esDispositivoNuevo && activos.length >= (licencia.limite_dispositivos || 1) 
                 ? 'Se ha desconectado una PC anterior por límite de dispositivos' 
                 : 'Inicio exitoso'
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
