import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
dotenv.config()

async function test() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "fakuanillo59@gmail.com",
    password: "654321"
  })
  
  if (authError) {
    console.error("Auth error:", authError)
    return
  }

  const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/login_dispositivo`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${authData.session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ machineId: "test-machine", nombreEquipo: "test-pc" })
  })

  const json = await response.json()
  console.log("Edge Function Response:", json)
}

test()
