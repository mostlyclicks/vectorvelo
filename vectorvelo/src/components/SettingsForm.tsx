'use client'
import { useState } from 'react'

interface Settings {
  hr_zone1_max: number
  hr_zone2_max: number
  hr_zone3_max: number
  hr_zone4_max: number
  ftp: number
  units: string
  glow_level: number
}

interface Props { initialValues?: Partial<Settings> }

const ZONE_COLORS = ['text-phos-cyan', 'text-phos-green', 'text-phos-amber', 'text-phos-red', 'text-phos-red']
const ZONE_LABELS = ['ZONE 1 MAX (RECOVERY)', 'ZONE 2 MAX (ENDURANCE)', 'ZONE 3 MAX (TEMPO)', 'ZONE 4 MAX (THRESHOLD)']

export default function SettingsForm({ initialValues }: Props) {
  const [values, setValues] = useState<Settings>({
    hr_zone1_max: initialValues?.hr_zone1_max ?? 115,
    hr_zone2_max: initialValues?.hr_zone2_max ?? 152,
    hr_zone3_max: initialValues?.hr_zone3_max ?? 162,
    hr_zone4_max: initialValues?.hr_zone4_max ?? 174,
    ftp:          initialValues?.ftp          ?? 200,
    units:        initialValues?.units        ?? 'imperial',
    glow_level:   initialValues?.glow_level   ?? 1.0,
  })
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function save() {
    setStatus('saving')
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    setStatus(res.ok ? 'saved' : 'error')
    setTimeout(() => setStatus('idle'), 2500)
  }

  function field(key: keyof Settings) {
    return {
      value: values[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setValues(v => ({ ...v, [key]: e.target.type === 'number' ? +e.target.value : e.target.value })),
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* HR Zones */}
      <section>
        <h2 style={{ fontSize: 11, letterSpacing: '0.3em' }} className="text-phos-green/50 mb-4">
          HEART RATE ZONES (BPM CEILINGS)
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {(['hr_zone1_max','hr_zone2_max','hr_zone3_max','hr_zone4_max'] as const).map((key, i) => (
            <label key={key} className="flex flex-col gap-1">
              <span className={`${ZONE_COLORS[i]}`} style={{ fontSize: 10, letterSpacing: '0.28em' }}>
                {ZONE_LABELS[i]}
              </span>
              <input
                type="number"
                min={50} max={220}
                {...field(key)}
                className={`bg-transparent vec-border ${ZONE_COLORS[i]} font-block px-3 py-2`}
                style={{ fontSize: 24, width: '100%', outline: 'none', borderColor: 'currentColor' }}
              />
            </label>
          ))}
        </div>
        <p className="text-phos-green/25 mt-3" style={{ fontSize: 10, letterSpacing: '0.2em' }}>
          ZONE 5 (VO2 MAX) = ABOVE ZONE 4 MAX. COLORS: CYAN → GREEN → AMBER → RED.
        </p>
      </section>

      {/* FTP */}
      <section>
        <h2 style={{ fontSize: 11, letterSpacing: '0.3em' }} className="text-phos-green/50 mb-4">
          POWER — FUNCTIONAL THRESHOLD POWER (FTP)
        </h2>
        <label className="flex flex-col gap-1">
          <span className="text-phos-green/60" style={{ fontSize: 10, letterSpacing: '0.28em' }}>FTP WATTS</span>
          <input
            type="number"
            min={50} max={800}
            {...field('ftp')}
            className="bg-transparent vec-border text-phos-green font-block px-3 py-2"
            style={{ fontSize: 32, width: 160, outline: 'none' }}
          />
        </label>
      </section>

      {/* Units */}
      <section>
        <h2 style={{ fontSize: 11, letterSpacing: '0.3em' }} className="text-phos-green/50 mb-4">UNITS</h2>
        <div className="flex gap-3">
          {[['imperial','MPH / MI'],['metric','KMH / KM']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setValues(v => ({ ...v, units: val }))}
              className={`btn-vec ${values.units === val ? 'text-phos-amber border-phos-amber' : 'text-phos-green/40 border-phos-green/30'}`}
              style={{ fontSize: 12, padding: '8px 18px' }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Glow */}
      <section>
        <h2 style={{ fontSize: 11, letterSpacing: '0.3em' }} className="text-phos-green/50 mb-4">
          HUD GLOW INTENSITY — {Math.round(values.glow_level * 100)}%
        </h2>
        <input
          type="range" min={0} max={2} step={0.05}
          value={values.glow_level}
          onChange={e => setValues(v => ({ ...v, glow_level: +e.target.value }))}
          className="w-full accent-phos-green"
          style={{ accentColor: '#39ff6e' }}
        />
      </section>

      {/* Save */}
      <button
        onClick={save}
        disabled={status === 'saving'}
        className="btn-vec text-phos-green border-phos-green mt-2"
        style={{ fontSize: 13, padding: '12px 28px', alignSelf: 'flex-start' }}
      >
        {status === 'saving' ? 'SAVING…'
          : status === 'saved'  ? '✓ SAVED'
          : status === 'error'  ? '✗ ERROR'
          : 'SAVE SETTINGS'}
      </button>
    </div>
  )
}
