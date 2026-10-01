import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()
const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY! // anon key can read, but maybe not update?
// Wait, to update I need service role key or let the user do it via migrar_cuenta!
// Actually, migrar_cuenta will link it automatically if they log in with that password!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  const { data: cliente, error: cliError } = await supabase
    .from('clientes')
    .select('id')
    .eq('email', 'fakuanillo59@gmail.com')
    .single()

  if (cliError || !cliente) {
    console.error('Error fetching cliente:', cliError)
    return
  }

  const { data: lic, error: licError } = await supabase
    .from('licencias')
    .update({ user_id: '4cf01a98-d571-473d-aedc-b5ebf7423ed3' })
    .eq('cliente_id', cliente.id)
    
  console.log('Update result:', lic, licError)
}

run()
