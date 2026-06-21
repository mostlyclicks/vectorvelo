import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VectorVelo — Arcade Cycling Trainer',
  description: 'Indoor cycling trainer with 1980s arcade aesthetics. Connect your Wahoo KICKR and ride.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-phos-bg text-phos-green antialiased">{children}</body>
    </html>
  )
}
