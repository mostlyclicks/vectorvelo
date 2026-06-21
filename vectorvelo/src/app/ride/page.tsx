import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import GameCanvas from '@/components/GameCanvas'

export default async function RidePage() {
  const session = await getSession()
  if (!session) redirect('/')

  const db = getSupabaseAdmin()
  const { data: user } = await db
    .from('users')
    .select('hr_zone1_max, hr_zone2_max, hr_zone3_max, hr_zone4_max, ftp, units, glow_level')
    .eq('id', session.userId)
    .single()

  return (
    <GameCanvas
      userSettings={user ?? undefined}
      displayName={session.displayName}
    />
  )
}
