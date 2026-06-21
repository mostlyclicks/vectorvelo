import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCode } from '@/lib/strava'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { setSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/?error=strava_denied', req.url))
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL('/?error=bad_request', req.url))
  }

  // Verify CSRF state
  const savedState = cookies().get('vv_oauth_state')?.value
  cookies().set('vv_oauth_state', '', { maxAge: 0, path: '/' })
  if (state !== savedState) {
    return NextResponse.redirect(new URL('/?error=state_mismatch', req.url))
  }

  try {
    const token = await exchangeCode(code)
    const athlete = token.athlete
    const db = getSupabaseAdmin()

    // Upsert user row
    const { data: user, error: dbErr } = await db
      .from('users')
      .upsert(
        {
          strava_athlete_id:    athlete.id,
          strava_access_token:  token.access_token,
          strava_refresh_token: token.refresh_token,
          strava_token_expiry:  token.expires_at,
          display_name: `${athlete.firstname} ${athlete.lastname}`.trim(),
          avatar_url:   athlete.profile,
        },
        { onConflict: 'strava_athlete_id' }
      )
      .select('id, display_name, avatar_url, strava_athlete_id')
      .single()

    if (dbErr || !user) throw dbErr ?? new Error('DB upsert failed')

    await setSession({
      userId:          user.id,
      stravaAthleteId: user.strava_athlete_id,
      displayName:     user.display_name ?? '',
      avatarUrl:       user.avatar_url ?? '',
    })

    return NextResponse.redirect(new URL('/dashboard', req.url))
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(new URL('/?error=server_error', req.url))
  }
}
