import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function HomePage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const session = await getSession()
  if (session) redirect('/dashboard')

  const errorMessages: Record<string, string> = {
    strava_denied:  'Strava authorization was cancelled.',
    state_mismatch: 'Security check failed. Please try again.',
    server_error:   'Something went wrong. Please try again.',
    bad_request:    'Invalid request. Please try again.',
  }
  const errorMsg = searchParams.error ? errorMessages[searchParams.error] : null

  return (
    <main className="scanlines flex min-h-screen flex-col items-center justify-center px-4">
      {/* CRT vignette */}
      <div
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        {/* Logo */}
        <div>
          <h1
            className="font-block text-phos-green glow-green"
            style={{ fontSize: 'clamp(56px, 10vw, 120px)', lineHeight: 1 }}
          >
            VECTOR
          </h1>
          <h1
            className="font-block text-phos-cyan glow-cyan"
            style={{ fontSize: 'clamp(56px, 10vw, 120px)', lineHeight: 1 }}
          >
            VELO
          </h1>
        </div>

        <p
          className="text-phos-white/60 glow-white"
          style={{ fontSize: 13, letterSpacing: '0.3em' }}
        >
          ARCADE CYCLING TRAINER · WAHOO KICKR · STRAVA
        </p>

        {errorMsg && (
          <p
            className="text-phos-red glow-red vec-border px-4 py-2"
            style={{ fontSize: 12, letterSpacing: '0.2em' }}
          >
            ⚠ {errorMsg.toUpperCase()}
          </p>
        )}

        {/* Strava connect */}
        <a
          href="/api/auth/strava"
          className="btn-vec text-phos-amber border-phos-amber"
          style={{ display: 'block', marginTop: 8 }}
        >
          ⚡ CONNECT WITH STRAVA
        </a>

        <p
          className="text-phos-green/30"
          style={{ fontSize: 11, letterSpacing: '0.25em', maxWidth: 360 }}
        >
          YOUR STRAVA ACCOUNT IS USED TO LOG IN AND SHARE RIDES.
          WE STORE ONLY YOUR RIDE DATA AND PREFERENCES.
        </p>
      </div>

      {/* bottom */}
      <p
        className="absolute bottom-6 text-phos-green/20"
        style={{ fontSize: 10, letterSpacing: '0.3em' }}
      >
        © 2026 MOSTLY CLICKS AMUSEMENTS · VECTORVELO.APP
      </p>
    </main>
  )
}
