import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavBar from '@/components/NavBar'
import SettingsForm from '@/components/SettingsForm'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const db = getSupabaseAdmin()
  const { data: user } = await db
    .from('users')
    .select('hr_zone1_max, hr_zone2_max, hr_zone3_max, hr_zone4_max, ftp, units, glow_level, display_name, avatar_url')
    .eq('id', session.userId)
    .single()

  return (
    <div className="min-h-screen" style={{ paddingTop: 52 }}>
      <NavBar displayName={session.displayName} avatarUrl={session.avatarUrl} />
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-block text-phos-green glow-green mb-8" style={{ fontSize: 38 }}>
          SETTINGS
        </h1>
        <SettingsForm initialValues={user ?? undefined} />
      </main>
    </div>
  )
}
