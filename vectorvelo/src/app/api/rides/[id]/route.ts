import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getSupabaseAdmin()
  const { data: ride, error } = await db
    .from('rides')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.userId)
    .single()

  if (error || !ride) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(ride)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getSupabaseAdmin()
  await db.from('rides').delete().eq('id', params.id).eq('user_id', session.userId)
  return NextResponse.json({ ok: true })
}
