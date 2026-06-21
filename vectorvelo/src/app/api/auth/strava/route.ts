import { redirect } from 'next/navigation'
import { stravaAuthUrl } from '@/lib/strava'
import { cookies } from 'next/headers'

export async function GET() {
  // CSRF state token
  const state = crypto.randomUUID()
  cookies().set('vv_oauth_state', state, { httpOnly: true, maxAge: 600, path: '/' })
  redirect(stravaAuthUrl(state))
}
