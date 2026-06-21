import { cookies } from 'next/headers'

export interface SessionData {
  userId: string
  stravaAthleteId: number
  displayName: string
  avatarUrl: string
}

const SESSION_COOKIE = 'vv_session'
const MAX_AGE = 60 * 60 * 24 * 30  // 30 days

/** Very light session: JSON signed with NEXTAUTH_SECRET via Web Crypto */
async function getKey() {
  const enc = new TextEncoder()
  const raw = enc.encode(process.env.NEXTAUTH_SECRET!)
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

async function sign(payload: string): Promise<string> {
  const key = await getKey()
  const data = new TextEncoder().encode(payload)
  const sig = await crypto.subtle.sign('HMAC', key, data)
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

async function verify(payload: string, sig: string): Promise<boolean> {
  const expected = await sign(payload)
  return expected === sig
}

export async function setSession(data: SessionData) {
  const payload = btoa(JSON.stringify(data))
  const sig = await sign(payload)
  const cookieStore = cookies()
  cookieStore.set(SESSION_COOKIE, `${payload}.${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = cookies()
  const raw = cookieStore.get(SESSION_COOKIE)?.value
  if (!raw) return null
  const [payload, sig] = raw.split('.')
  if (!payload || !sig) return null
  const ok = await verify(payload, sig)
  if (!ok) return null
  try { return JSON.parse(atob(payload)) as SessionData }
  catch { return null }
}

export async function clearSession() {
  cookies().set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
}
