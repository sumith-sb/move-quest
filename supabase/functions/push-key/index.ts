/**
 * Return the VAPID public key for Web Push subscription.
 * Requires Authorization bearer (authenticated user).
 */

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
  if (req.method !== 'GET') {
    return json(405, { error: { code: 'METHOD', message: 'GET required' } })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json(401, { error: { code: 'UNAUTHORIZED', message: 'Missing token' } })
  }

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  if (!publicKey) {
    return json(503, {
      error: { code: 'NOT_CONFIGURED', message: 'VAPID_PUBLIC_KEY not set' },
    })
  }

  return json(200, { publicKey })
})
