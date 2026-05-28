import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { oldEndpoint, newSubscription, userId } = await req.json()
    if (!newSubscription?.endpoint) {
      return new Response('bad request', { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Primary path: find user by old endpoint and update
    if (oldEndpoint) {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .filter('subscription->>endpoint', 'eq', oldEndpoint)
        .single()

      if (!error && data) {
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
      }

      console.log('[update-push-sub] old endpoint not found:', oldEndpoint, error?.message)
    }

    // Fallback: old endpoint was not in DB (deleted after 410 or first seen).
    // Use userId stored in the SW cache to upsert the new subscription directly.
    if (userId) {
      const { error: upsertError } = await supabase
        .from('push_subscriptions')
        .upsert(
          { user_id: userId, subscription: newSubscription, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )

      if (upsertError) {
        console.error('[update-push-sub] upsert fallback error:', upsertError.message)
        return new Response('error', { status: 500, headers: corsHeaders })
      }

      console.log('[update-push-sub] upserted via userId fallback:', userId)
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    return new Response('not found', { status: 404, headers: corsHeaders })
  } catch (e) {
    console.error('[update-push-sub] error:', e)
    return new Response('error', { status: 500, headers: corsHeaders })
  }
})
