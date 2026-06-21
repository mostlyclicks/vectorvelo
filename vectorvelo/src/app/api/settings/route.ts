import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('users')
    .select('hr_zone1_max, hr_zone2_max, hr_zone3_max, hr_zone4_max, ftp, units, glow_level, display_name, avatar_url')
    .eq('id', session.userId)
    .single()

  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['hr_zone1_max','hr_zone2_max','hr_zone3_max','hr_zone4_max','ftp','units','glow_level']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('users')
    .update(updates)
    .eq('id', session.userId)
    .select('hr_zone1_max, hr_zone2_max, hr_zone3_max, hr_zone4_max, ftp, units, glow_level')
    .single()

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json(data)
}
