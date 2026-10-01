import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()
const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY! // anon key is not enough, wait I need the service key!
// If I don't have the service key, I can just use auth.signUp

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  const { data, error } = await supabase.auth.signUp({
    email: 'fakuanillo59@gmail.com',
    password: '654321',
  })
  
  if (error) {
    console.error('Error:', error.message)
  } else {
    console.log('User created:', data.user?.id)
  }
}

run()
