/**
 * Release expired verification leases and delete orphan storage objects.
 * Invoke on a schedule with the service role (verify_jwt = false; protect via cron secret).
 *
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLEANUP_CRON_SECRET
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CLEANUP_CRON_SECRET')
  if (cronSecret) {
    const provided = req.headers.get('x-cron-secret')
    if (provided !== cronSecret) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY')!
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: expired, error } = await admin.rpc(
    'list_expired_verification_leases',
  )
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const rows = (expired ?? []) as Array<{
    attempt_id: string
    user_id: string
    photo_path: string
  }>

  let released = 0
  let removed = 0
  for (const row of rows) {
    await admin.storage.from('challenge-photos').remove([row.photo_path])
    removed += 1
    await admin.rpc('release_expired_lease', { p_attempt_id: row.attempt_id })
    released += 1
  }

  return new Response(
    JSON.stringify({ ok: true, released, removed }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
