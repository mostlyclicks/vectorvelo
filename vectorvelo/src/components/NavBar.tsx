'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  displayName: string
  avatarUrl:   string
}

export default function NavBar({ displayName, avatarUrl }: Props) {
  const path = usePathname()
  const links = [
    { href: '/ride',      label: 'RIDE' },
    { href: '/dashboard', label: 'HISTORY' },
    { href: '/settings',  label: 'SETTINGS' },
  ]

  return (
    <header
      className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-6"
      style={{
        height: 52,
        borderBottom: '1px solid rgba(57,255,110,0.2)',
        background: 'rgba(2,4,3,0.92)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <Link
        href="/dashboard"
        className="font-block text-phos-green glow-green"
        style={{ fontSize: 22, letterSpacing: '0.06em' }}
      >
        VECTOR VELO
      </Link>

      <nav className="flex gap-6">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={path === l.href ? 'text-phos-amber glow-amber' : 'text-phos-green/60 hover:text-phos-green transition-colors'}
            style={{ fontSize: 12, letterSpacing: '0.25em' }}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        {avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full" style={{ border: '1px solid #39ff6e44' }} />
        )}
        <span className="text-phos-green/60" style={{ fontSize: 11, letterSpacing: '0.2em' }}>
          {displayName.toUpperCase()}
        </span>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-phos-red/60 hover:text-phos-red transition-colors"
            style={{ fontSize: 11, letterSpacing: '0.2em', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            SIGN OUT
          </button>
        </form>
      </div>
    </header>
  )
}
