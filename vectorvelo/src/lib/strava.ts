import axios from 'axios'
import { getSupabaseAdmin } from './supabase/server'

export const STRAVA_SCOPE = 'read,activity:write'

export function stravaAuthUrl(state: string) {
  const p = new URLSearchParams({
    client_id:     process.env.STRAVA_CLIENT_ID!,
    redirect_uri:  process.env.STRAVA_REDIRECT_URI!,
    response_type: 'code',
    approval_prompt: 'auto',
    scope:         STRAVA_SCOPE,
    state,
  })
  return `https://www.strava.com/oauth/authorize?${p}`
}

export async function exchangeCode(code: string) {
  const { data } = await axios.post('https://www.strava.com/oauth/token', {
    client_id:     process.env.STRAVA_CLIENT_ID!,
    client_secret: process.env.STRAVA_CLIENT_SECRET!,
    code,
    grant_type: 'authorization_code',
  })
  return data as StravaTokenResponse
}

export async function refreshToken(userId: string, refreshToken: string) {
  const { data } = await axios.post('https://www.strava.com/oauth/token', {
    client_id:     process.env.STRAVA_CLIENT_ID!,
    client_secret: process.env.STRAVA_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const t = data as StravaTokenResponse
  const db = getSupabaseAdmin()
  await db.from('users').update({
    strava_access_token:  t.access_token,
    strava_refresh_token: t.refresh_token,
    strava_token_expiry:  t.expires_at,
  }).eq('id', userId)
  return t.access_token
}

/** Returns a valid access token, refreshing if needed */
export async function getValidToken(user: {
  id: string
  strava_access_token: string
  strava_refresh_token: string
  strava_token_expiry: number
}) {
  if (Date.now() / 1000 < user.strava_token_expiry - 60) {
    return user.strava_access_token
  }
  return refreshToken(user.id, user.strava_refresh_token)
}

/** Upload a TCX file to Strava as a virtual ride */
export async function uploadTcxToStrava(
  accessToken: string,
  tcxContent: string,
  name: string,
  description = 'Uploaded from VectorVelo arcade trainer'
) {
  const FormData = (await import('form-data')).default
  const form = new FormData()
  form.append('data_type', 'tcx')
  form.append('activity_type', 'virtualride')
  form.append('name', name)
  form.append('description', description)
  form.append('file', Buffer.from(tcxContent, 'utf8'), {
    filename: 'ride.tcx',
    contentType: 'application/vnd.garmin.tcx+xml',
  })
  const { data } = await axios.post(
    'https://www.strava.com/api/v3/uploads',
    form,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...form.getHeaders(),
      },
    }
  )
  return data as { id: number; activity_id?: number; status: string; error?: string }
}

/** Poll upload status until it resolves (max 20s) */
export async function pollUpload(accessToken: string, uploadId: number) {
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const { data } = await axios.get(
      `https://www.strava.com/api/v3/uploads/${uploadId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (data.activity_id) return data as { activity_id: number }
    if (data.error) throw new Error(data.error)
  }
  throw new Error('Upload timed out')
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface StravaTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: {
    id: number
    firstname: string
    lastname: string
    profile: string   // avatar URL
  }
}
