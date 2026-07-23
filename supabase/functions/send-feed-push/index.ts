/**
 * Send feed Web Push to all subscribers except the post author.
 * Invoked by verify-photo with the service role key (fire-and-forget).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import webpush from 'npm:web-push@3.6.7'

type SubRow = {
  endpoint: string
  user_id: string
  subscription: webpush.PushSubscription
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (req.method !== 'POST') {
    return json(405, { error: { code: 'METHOD', message: 'POST required' } })
  }

  const authHeader = req.headers.get('Authorization')
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY') ??
    ''
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : ''
  if (!token || token !== serviceKey) {
    return json(401, { error: { code: 'UNAUTHORIZED', message: 'Service role required' } })
  }

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:team@goodspeed.studio'
  if (!publicKey || !privateKey) {
    return json(503, {
      error: { code: 'NOT_CONFIGURED', message: 'VAPID keys not set' },
    })
  }

  let authorId: string
  let title: string
  let body: string
  try {
    const payload = (await req.json()) as {
      authorId?: string
      title?: string
      body?: string
    }
    authorId = String(payload.authorId ?? '')
    title = String(payload.title ?? 'Move Quest')
    body = String(payload.body ?? 'Something new on the feed')
    if (!authorId) {
      return json(400, {
        error: { code: 'BAD_REQUEST', message: 'authorId required' },
      })
    }
  } catch {
    return json(400, { error: { code: 'BAD_REQUEST', message: 'Invalid JSON' } })
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: rows, error } = await admin.rpc('list_push_subscriptions_except', {
    p_user_id: authorId,
  })
  if (error) {
    console.error('list_push_subscriptions_except failed', error)
    return json(500, { error: { code: 'LIST_FAILED', message: error.message } })
  }

  const targets = (rows ?? []) as SubRow[]
  if (targets.length === 0) {
    return json(200, { sent: 0, pruned: 0 })
  }

  const appUrl =
    Deno.env.get('APP_PUBLIC_URL') ?? 'https://sumith-sb.github.io/move-quest/'
  const payload = JSON.stringify({ title, body, url: appUrl })
  const dead: string[] = []
  let sent = 0

  await Promise.all(
    targets.map(async (t) => {
      try {
        await webpush.sendNotification(t.subscription, payload)
        sent += 1
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) dead.push(t.endpoint)
        else console.error('push failed', t.endpoint, err)
      }
    }),
  )

  if (dead.length > 0) {
    await admin.rpc('prune_push_subscriptions', { p_endpoints: dead })
  }

  return json(200, { sent, pruned: dead.length })
})
