import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavBar from '@/components/NavBar'
import Link from 'next/link'

function fmtTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60
  return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(x).padStart(2, '0')
}
function fmtDist(m: number, imperial = true) {
  return imperial ? (m / 1609.344).toFixed(2) + ' mi' : (m / 1000).toFixed(2) + ' km'
}

export default async function Dashboard() {
  const session = await getSession()
  if (!session) redirect('/')

  const db = getSupabaseAdmin()
  const { data: rides = [] } = await db
    .from('rides')
    .select('id, started_at, elapsed_seconds, distance_meters, avg_power_watts, avg_hr_bpm, energy_kj, score, strava_url')
    .eq('user_id', session.userId)
    .order('started_at', { ascending: false })
    .limit(50)

  const { data: user } = await db
    .from('users')
    .select('units, display_name, avatar_url')
    .eq('id', session.userId)
    .single()

  const imperial = user?.units !== 'metric'

  // Lifetime totals
  const totalDist  = rides.reduce((s, r) => s + (r.distance_meters ?? 0), 0)
  const totalTime  = rides.reduce((s, r) => s + (r.elapsed_seconds ?? 0), 0)
  const totalEnergy = rides.reduce((s, r) => s + (r.energy_kj ?? 0), 0)

  return (
    <div className="min-h-screen" style={{ paddingTop: 52 }}>
      <NavBar displayName={session.displayName} avatarUrl={session.avatarUrl} />

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Lifetime stats */}
        <section className="mb-8 grid grid-cols-3 gap-4">
          {[
            ['TOTAL RIDES', String(rides.length), 'text-phos-green'],
            ['TOTAL DIST',  fmtDist(totalDist, imperial).toUpperCase(), 'text-phos-cyan'],
            ['TOTAL TIME',  fmtTime(totalTime), 'text-phos-amber'],
            ['TOTAL ENERGY', Math.round(totalEnergy) + ' KJ', 'text-phos-green'],
          ].map(([label, value, color]) => (
            <div key={label} className="vec-border p-4" style={{ borderColor: 'rgba(57,255,110,0.25)' }}>
              <p className="text-phos-green/40 mb-1" style={{ fontSize: 10, letterSpacing: '0.3em' }}>{label}</p>
              <p className={`font-block ${color}`} style={{ fontSize: 28 }}>{value}</p>
            </div>
          ))}
        </section>

        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="glow-green" style={{ fontSize: 13, letterSpacing: '0.3em' }}>RIDE HISTORY</h2>
          <Link
            href="/ride"
            className="btn-vec text-phos-green border-phos-green"
            style={{ padding: '8px 18px', fontSize: 12 }}
          >
            ▶ NEW RIDE
          </Link>
        </div>

        {rides.length === 0 && (
          <div className="text-center py-20 text-phos-green/30" style={{ fontSize: 13, letterSpacing: '0.3em' }}>
            NO RIDES YET. INSERT WATTS TO PLAY.
          </div>
        )}

        {/* Ride rows */}
        <div className="flex flex-col gap-3">
          {rides.map(ride => {
            const date = new Date(ride.started_at)
            return (
              <Link
                key={ride.id}
                href={`/rides/${ride.id}`}
                className="grid items-center hover:bg-phos-green/5 transition-colors p-4 vec-border"
                style={{
                  gridTemplateColumns: '160px 1fr 1fr 1fr 1fr 80px',
                  borderColor: 'rgba(57,255,110,0.18)',
                  gap: 12,
                }}
              >
                <span className="text-phos-white/70" style={{ fontSize: 12, letterSpacing: '0.1em' }}>
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  <br />
                  <span className="text-phos-green/40" style={{ fontSize: 10 }}>
                    {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
                <StatCell label="DIST"  value={fmtDist(ride.distance_meters ?? 0, imperial).toUpperCase()} color="text-phos-cyan" />
                <StatCell label="TIME"  value={fmtTime(ride.elapsed_seconds ?? 0)} color="text-phos-white" />
                <StatCell label="AVG W" value={(ride.avg_power_watts ?? 0).toFixed(0) + 'W'} color="text-phos-green" />
                <StatCell label="SCORE" value={String(ride.score ?? 0).padStart(6, '0')} color="text-phos-amber" />
                <span className="text-right" style={{ fontSize: 11, letterSpacing: '0.15em' }}>
                  {ride.strava_url
                    ? <span className="text-phos-amber glow-amber">STRAVA ↗</span>
                    : <span className="text-phos-green/30">LOCAL</span>}
                </span>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-phos-green/30" style={{ fontSize: 9, letterSpacing: '0.3em' }}>{label}</p>
      <p className={`font-block ${color}`} style={{ fontSize: 20 }}>{value}</p>
    </div>
  )
}
