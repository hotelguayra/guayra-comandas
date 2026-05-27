import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record
    console.log('[send-push] record.estado:', record?.estado, 'record.id:', record?.id, 'record.pedido_id:', record?.pedido_id)

    if (!record || record.estado !== 'listo') {
      console.log('[send-push] skipping: estado is', record?.estado)
      return new Response('ok', { status: 200 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Support webhook on either pedidos (record.id) or pedido_panel_estados (record.pedido_id)
    const pedidoId = record.pedido_id ?? record.id
    console.log('[send-push] pedidoId:', pedidoId)

    const { data: pedido } = await supabase
      .from('pedidos')
      .select('mozo_id, mesa_id, mesa:mesas(nombre, cliente)')
      .eq('id', pedidoId)
      .single()

    console.log('[send-push] pedido mozo_id:', pedido?.mozo_id)
    if (!pedido?.mozo_id) return new Response('ok')

    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', pedido.mozo_id)

    console.log('[send-push] subs count:', subs?.length, 'error:', subsError?.message ?? 'none')
    if (!subs?.length) return new Response('ok')

    webpush.setVapidDetails(
      `mailto:${Deno.env.get('VAPID_SUBJECT')}`,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    )

    const mesa = pedido.mesa as any
    const title = `¡${mesa?.nombre ?? 'Pedido'} listo para retirar!`
    const body = mesa?.cliente ? `Cliente: ${mesa.cliente}` : 'Retirá el pedido en cocina'

    const results = await Promise.allSettled(
      subs.map(({ subscription }) =>
        webpush.sendNotification(
          subscription as any,
          JSON.stringify({ title, body, url: `/mozo/mis-pedidos?mesa=${pedido.mesa_id}`, pedidoId })
        )
      )
    )
    console.log('[send-push] results:', JSON.stringify(results))

    // Clean up expired subscriptions (HTTP 410 = gone, 404 = not found — both mean invalid)
    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      if (r.status === 'rejected' && (r.reason?.statusCode === 410 || r.reason?.statusCode === 404)) {
        await supabase.from('push_subscriptions').delete().eq('user_id', pedido.mozo_id)
      }
    }

    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error('[send-push] error:', e)
    return new Response('error', { status: 500 })
  }
})
