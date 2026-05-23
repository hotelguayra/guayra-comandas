import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record

    if (!record || record.estado !== 'listo') {
      return new Response('ok', { status: 200 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: pedido } = await supabase
      .from('pedidos')
      .select('mozo_id, mesa:mesas(nombre, cliente)')
      .eq('id', record.pedido_id)
      .single()

    if (!pedido?.mozo_id) return new Response('ok')

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', pedido.mozo_id)

    if (!subs?.length) return new Response('ok')

    webpush.setVapidDetails(
      `mailto:${Deno.env.get('VAPID_SUBJECT')}`,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    )

    const mesa = pedido.mesa as any
    const title = `¡${mesa?.nombre ?? 'Pedido'} listo para retirar!`
    const body = mesa?.cliente ? `Cliente: ${mesa.cliente}` : 'Retirá el pedido en cocina'

    await Promise.allSettled(
      subs.map(({ subscription }) =>
        webpush.sendNotification(
          subscription as any,
          JSON.stringify({ title, body, url: '/mozo/mis-pedidos' })
        )
      )
    )

    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response('error', { status: 500 })
  }
})
