import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import NavBar from '@/components/NavBar'
import Link from 'next/link'

function fmtTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60
  return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(x).padStart(2, '0')
}

export default async function RideDetail({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/')

  const db = getSupabaseAdmin()
  const { data: ride } = await db
    .from('rides')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.userId)
    .single()

  if (!ride) notFound()

  const { data: user } = await db
    .from('users')
    .select('units')
    .eq('id', session.userId)
    .single()

  const imperial = user?.units !== 'metric'

  const dist = imperial
    ? (ride.distance_meters / 1609.344).toFixed(2) + ' MI'
    : (ride.distance_meters / 1000).toFixed(2) + ' KM'

  const toSpeed = (kmh: number) =>
    imperial ? (kmh * 0.621371).toFixed(1) + ' MPH' : kmh.toFixed(1) + ' KMH'

  const stats = [
    { label: 'TIME',       value: fmtTime(ride.elapsed_seconds),          color: 'text-phos-white' },
    { label: 'DISTANCE',   value: dist,                                    color: 'text-phos-cyan'  },
    { label: 'AVG POWER',  value: (ride.avg_power_watts ?? 0).toFixed(0) + ' W', color: 'text-phos-green' },
    { label: 'MAX POWER',  value: (ride.max_power_watts ?? 0).toFixed(0) + ' W', color: 'text-phos-green' },
    { label: 'AVG SPEED',  value: toSpeed(ride.avg_speed_kmh ?? 0),        color: 'text-phos-cyan'  },
    { label: 'MAX SPEED',  value: toSpeed(ride.max_speed_kmh ?? 0),        color: 'text-phos-cyan'  },
    { label: 'AVG HR',     value: ride.avg_hr_bpm ? Math.round(ride.avg_hr_bpm) + ' BPM' : '—', color: 'text-phos-red' },
    { label: 'MAX HR',     value: ride.max_hr_bpm ? Math.round(ride.max_hr_bpm) + ' BPM' : '—', color: 'text-phos-red' },
    { label: 'ENERGY',     value: Math.round(ride.energy_kj ?? 0) + ' KJ', color: 'text-phos-amber' },
    { label: 'SCORE',      value: String(ride.score ?? 0).padStart(6, '0'), color: 'text-phos-amber' },
  ]

  return (
    <div className="min-h-screen" style={{ paddingTop: 52 }}>
      <NavBar displayName={session.displayName} avatarUrl={session.avatarUrl} />

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-phos-green/40 hover:text-phos-green transition-colors" style={{ fontSize: 11, letterSpacing: '0.3em' }}>
              ← HISTORY
            </Link>
            <h1 className="font-block text-phos-green glow-green mt-2" style={{ fontSize: 38 }}>
              RIDE COMPLETE
            </h1>
            <p className="text-phos-green/40 mt-1" style={{ fontSize: 11, letterSpacing: '0.25em' }}>
              {new Date(ride.started_at).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              }).toUpperCase()}
            </p>
          </div>

          {ride.strava_url && (
            <a
              href={ride.strava_url}
              target="_blank"
              rel="noreferrer"
              className="btn-vec text-phos-amber border-phos-amber"
              style={{ fontSize: 12, padding: '8px 16px' }}
            >
              VIEW ON STRAVA ↗
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {stats.map(({ label, value, color }) => (
            <div
              key={label}
              className="vec-border p-5"
              style={{ borderColor: 'rgba(57,255,110,0.2)' }}
            >
              <p className="text-phos-green/35 mb-2" style={{ fontSize: 10, letterSpacing: '0.35em' }}>{label}</p>
              <p className={`font-block ${color}`} style={{ fontSize: 36 }}>{value}</p>
            </div>
          ))}
        </div>

        {!ride.strava_url && (
          <StravaUploadButton rideId={ride.id} />
        )}
      </main>
    </div>
  )
}

// Client component for post-hoc Strava upload
function StravaUploadButton({ rideId }: { rideId: string }) {
  // We render a simple form here; full client interaction in the game itself
  return (
    <div className="mt-6 text-center">
      <p className="text-phos-green/30 mb-3" style={{ fontSize: 11, letterSpacing: '0.25em' }}>
        THIS RIDE HAS NOT BEEN SHARED TO STRAVA
      </p>
    </div>
  )
}
