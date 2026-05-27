import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { oldEndpoint, newSubscription } = await req.json()
    if (!oldEndpoint || !newSubscription?.endpoint) {
      return new Response('bad request', { status: 400, headers: corsHeaders })
    }

    // Service role key required: this endpoint is called by the SW (no user auth context)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Find user by old endpoint (JSONB text extraction)
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .filter('subscription->>endpoint', 'eq', oldEndpoint)
      .single()

    if (error || !data) {
      console.log('[update-push-sub] not found for endpoint:', oldEndpoint, error?.message)
      return new Response('not found', { status: 404, headers: corsHeaders })
    }

    const { error: updateError } = await supabase
      .from('push_subscriptions')
      .update({ subscription: newSubscription, updated_at: new Date().toISOString() })
      .eq('user_id', data.user_id)

    if (updateError) {
      console.error('[update-push-sub] update error:', updateError.message)
      return new Response('error', { status: 500, headers: corsHeaders })
    }

    console.log('[update-push-sub] updated subscription for user:', data.user_id)
    return new Response('ok', { status: 200, headers: corsHeaders })
  } catch (e) {
    console.error('[update-push-sub] error:', e)
    return new Response('error', { status: 500, headers: corsHeaders })
  }
})
