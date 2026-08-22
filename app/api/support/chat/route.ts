import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/supabase/server'
import {
  buildWhatsAppDeepLink,
  formatSupportMessage,
  getSupportWhatsAppE164,
  isSupportWhatsAppApiConfigured,
  notifySupportWhatsApp,
} from '@/lib/support/whatsapp'

export const runtime = 'nodejs'
export const maxDuration = 30

const BodySchema = z.object({
  message: z.string().trim().min(3).max(2000),
  pagePath: z.string().trim().max(500).optional().nullable(),
  /** Se true, tenta notificar via Uazapi além de devolver o deep link. */
  notifyApi: z.boolean().optional().default(true),
})

export async function GET() {
  return NextResponse.json({
    phoneE164: getSupportWhatsAppE164(),
    apiConfigured: isSupportWhatsAppApiConfigured(),
  })
}

export async function POST(req: Request) {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const user = await getUser().catch(() => null)
  const phoneE164 = getSupportWhatsAppE164()
  const text = formatSupportMessage({
    message: parsed.data.message,
    userName: user?.user_metadata?.full_name ?? user?.email ?? null,
    userEmail: user?.email ?? null,
    pagePath: parsed.data.pagePath ?? null,
  })
  const waLink = buildWhatsAppDeepLink(phoneE164, text)

  let apiNotify: { ok: boolean; via: string; error?: string } | null = null
  if (parsed.data.notifyApi && isSupportWhatsAppApiConfigured()) {
    apiNotify = await notifySupportWhatsApp(text)
  }

  return NextResponse.json({
    ok: true,
    waLink,
    phoneE164,
    apiNotify,
  })
}
