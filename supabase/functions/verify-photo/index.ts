/**
 * Demo auto-accept: upload photo to Storage and award points (no AI vision).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const MAX_BYTES = 1024 * 1024
const MODEL = 'demo-auto-accept'

type ClaimPayload = {
  attempt_id: string
  lease_token: string
  photo_path: string
  challenge: {
    id: string
    title: string
    prompt: string
    points: number
  }
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

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (req.method !== 'POST') {
    return json(405, { error: { code: 'METHOD', message: 'POST required' } })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json(401, { error: { code: 'UNAUTHORIZED', message: 'Missing token' } })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey =
    Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  if (userErr || !user) {
    return json(401, { error: { code: 'UNAUTHORIZED', message: 'Invalid session' } })
  }

  let attemptId: string
  let photoBytes: Uint8Array
  try {
    const form = await req.formData()
    attemptId = String(form.get('attempt_id') ?? '')
    const photo = form.get('photo')
    if (!attemptId || !(photo instanceof File)) {
      return json(400, {
        error: { code: 'BAD_REQUEST', message: 'attempt_id and photo required' },
      })
    }
    if (photo.size > MAX_BYTES) {
      return json(413, {
        error: { code: 'TOO_LARGE', message: 'Photo must be under 1 MiB' },
      })
    }
    photoBytes = new Uint8Array(await photo.arrayBuffer())
  } catch {
    return json(400, {
      error: { code: 'BAD_REQUEST', message: 'Invalid multipart body' },
    })
  }

  if (!isJpeg(photoBytes)) {
    return json(415, {
      error: { code: 'INVALID_IMAGE', message: 'JPEG required' },
    })
  }

  const { data: claim, error: claimErr } = await userClient.rpc(
    'claim_verification',
    { p_attempt_id: attemptId },
  )
  if (claimErr) {
    const msg = claimErr.message || 'Claim failed'
    const code = msg.includes('RATE_LIMIT')
      ? 'RATE_LIMIT'
      : msg.includes('IN_PROGRESS')
        ? 'IN_PROGRESS'
        : msg.includes('ALREADY')
          ? 'ALREADY_ACCEPTED'
          : 'CLAIM_FAILED'
    const status =
      code === 'RATE_LIMIT' ? 429 : code === 'IN_PROGRESS' ? 409 : 400
    return json(status, { error: { code, message: msg } })
  }

  const claimPayload = claim as ClaimPayload
  const photoPath = claimPayload.photo_path
  const leaseToken = claimPayload.lease_token
  const challenge = claimPayload.challenge

  const fail = async (status: 'rejected' | 'error', reason: string) => {
    await admin.rpc('mark_verification_failed', {
      p_attempt_id: attemptId,
      p_lease_token: leaseToken,
      p_user_id: user.id,
      p_status: status,
      p_reason: reason,
      p_confidence: null,
      p_model_name: MODEL,
      p_model_output: null,
    })
  }

  try {
    const hash = await sha256Hex(photoBytes)
    const { error: uploadErr } = await admin.storage
      .from('challenge-photos')
      .upload(photoPath, photoBytes, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (uploadErr) {
      console.error('upload failed', uploadErr)
      await fail('error', 'Could not store photo. Try again.')
      return json(500, {
        error: { code: 'UPLOAD_FAILED', message: 'Could not store photo' },
      })
    }

    const { data: finalized, error: finalErr } = await admin.rpc(
      'finalize_verification',
      {
        p_attempt_id: attemptId,
        p_lease_token: leaseToken,
        p_user_id: user.id,
        p_photo_path: photoPath,
        p_photo_sha256: hash,
        p_confidence: 1,
        p_reason: 'Looks good!',
        p_model_name: MODEL,
        p_model_output: { demo: true },
      },
    )

    if (finalErr) {
      console.error('finalize failed', finalErr)
      await admin.storage.from('challenge-photos').remove([photoPath])
      await fail('error', 'Could not award points. Try again.')
      return json(500, {
        error: { code: 'FINALIZE_FAILED', message: finalErr.message },
      })
    }

    return json(200, {
      result: {
        status: 'accepted',
        pass: true,
        confidence: 1,
        reason: 'Looks good!',
        pointsAwarded:
          (finalized as { points_awarded?: number })?.points_awarded ??
          challenge.points,
        retryable: false,
      },
    })
  } catch (err) {
    console.error('verify-photo failed', err)
    await fail('error', 'Verification failed. Try again.')
    return json(500, {
      error: { code: 'INTERNAL', message: 'Verification failed' },
    })
  }
})
