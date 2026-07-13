import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Authenticate
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const { mode } = await req.json().catch(() => ({}))

    // Admin client to fetch data
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Generate summary data
    const today = new Date().toISOString().split('T')[0]
    
    const { count: pickupCount } = await supabaseAdmin.from('pickups').select('*', { count: 'exact', head: true }).eq('date', today)
    const { count: dumpCount } = await supabaseAdmin.from('dumps').select('*', { count: 'exact', head: true })
    
    const reportData = {
      pickups_today: pickupCount || 0,
      dumps_today: dumpCount || 0,
      generated_at: new Date().toISOString()
    }

    if (mode === 'store_only' || mode === 'generate') {
      const { error: insertError } = await supabaseAdmin.from('daily_reports').insert({
        date: today,
        type: 'operations_summary',
        data: reportData
      })
      if (insertError) throw insertError
    }

    return new Response(
      JSON.stringify({ success: true, report: reportData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
