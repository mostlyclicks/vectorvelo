import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getValidToken, uploadTcxToStrava, pollUpload } from '@/lib/strava'
import { buildTcx, type TcxSample } from '@/lib/tcx'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { stats, samples, uploadToStrava } = body as {
    stats: {
      startedAt: string
      elapsedSeconds: number
      distanceMeters: number
      avgPower: number
      maxPower: number
      avgHr?: number
      maxHr?: number
      avgSpeedKmh: number
      maxSpeedKmh: number
      energyKj: number
    }
    samples: TcxSample[]
    uploadToStrava: boolean
  }

  const db = getSupabaseAdmin()

  // Insert ride row
  const { data: ride, error: rideErr } = await db
    .from('rides')
    .insert({
      user_id:         session.userId,
      started_at:      stats.startedAt,
      elapsed_seconds: stats.elapsedSeconds,
      distance_meters: stats.distanceMeters,
      avg_power_watts: stats.avgPower,
      max_power_watts: stats.maxPower,
      avg_hr_bpm:      stats.avgHr ?? null,
      max_hr_bpm:      stats.maxHr ?? null,
      avg_speed_kmh:   stats.avgSpeedKmh,
      max_speed_kmh:   stats.maxSpeedKmh,
      energy_kj:       stats.energyKj,
      score:           Math.round(stats.energyKj),
    })
    .select('id')
    .single()

  if (rideErr || !ride) {
    return NextResponse.json({ error: 'Failed to save ride' }, { status: 500 })
  }

  // Bulk insert samples (chunked to avoid Supabase payload limits)
  if (samples.length) {
    const rows = samples.map((s, i) => ({
      ride_id:     ride.id,
      t:           i,
      power_w:     s.power,
      cadence_rpm: s.cad,
      speed_kmh:   s.speedMs * 3.6,
      hr_bpm:      s.hr ?? null,
    }))
    const CHUNK = 500
    for (let i = 0; i < rows.length; i += CHUNK) {
      await db.from('ride_samples').insert(rows.slice(i, i + CHUNK))
    }
  }

  // Optional Strava upload
  let stravaUrl: string | null = null
  if (uploadToStrava) {
    try {
      const { data: user } = await db
        .from('users')
        .select('strava_access_token, strava_refresh_token, strava_token_expiry')
        .eq('id', session.userId)
        .single()

      if (user) {
        const token  = await getValidToken({ id: session.userId, ...user })
        const tcx    = buildTcx(samples, {
          startTime:      new Date(stats.startedAt),
          elapsedSeconds: stats.elapsedSeconds,
          distanceMeters: stats.distanceMeters,
          avgPower:       stats.avgPower,
          maxPower:       stats.maxPower,
          avgHr:          stats.avgHr,
          energyKj:       stats.energyKj,
        })
        const rideName = `VectorVelo — ${new Date(stats.startedAt).toLocaleDateString()}`
        const upload = await uploadTcxToStrava(token, tcx, rideName)
        // Poll for activity_id (Strava processes async)
        try {
          const resolved = await pollUpload(token, upload.id)
          stravaUrl = `https://www.strava.com/activities/${resolved.activity_id}`
          await db.from('rides').update({
            strava_activity_id: resolved.activity_id,
            strava_url:         stravaUrl,
          }).eq('id', ride.id)
        } catch {
          // upload queued but not resolved yet — that's fine
        }
      }
    } catch (e) {
      console.error('Strava upload error:', e)
      // Don't fail the whole request — ride is saved locally
    }
  }

  return NextResponse.json({ rideId: ride.id, stravaUrl })
}
