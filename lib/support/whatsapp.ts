/**
 * Suporte MedVision → WhatsApp do Marcos
 *
 * - Gera deep link wa.me (sempre disponível)
 * - Opcionalmente notifica via Uazapi (env) com o mesmo conteúdo
 */

export const DEFAULT_SUPPORT_WHATSAPP_E164 = '558486174829'

export function getSupportWhatsAppE164(): string {
  const fromEnv =
    process.env.SUPPORT_WHATSAPP_E164?.replace(/\D/g, '').trim() ||
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_E164?.replace(/\D/g, '').trim()
  return fromEnv || DEFAULT_SUPPORT_WHATSAPP_E164
}

export function buildWhatsAppDeepLink(phoneE164: string, text: string): string {
  const phone = phoneE164.replace(/\D/g, '')
  const q = encodeURIComponent(text)
  return `https://wa.me/${phone}?text=${q}`
}

export function formatSupportMessage(input: {
  message: string
  userName?: string | null
  userEmail?: string | null
  pagePath?: string | null
}): string {
  const lines = [
    '*Suporte MedVision*',
    '',
    input.message.trim(),
    '',
  ]
  if (input.userName) lines.push(`Nome: ${input.userName}`)
  if (input.userEmail) lines.push(`Email: ${input.userEmail}`)
  if (input.pagePath) lines.push(`Página: ${input.pagePath}`)
  lines.push(`Em: ${new Date().toISOString()}`)
  return lines.join('\n')
}

type UazapiConfig = {
  server: string
  token: string
}

function getUazapiConfig(): UazapiConfig | null {
  const server = (
    process.env.MEDVISION_UAZAPI_SERVER ||
    process.env.UAZAPI_SERVER ||
    ''
  )
    .trim()
    .replace(/\/$/, '')
  const token = (
    process.env.MEDVISION_UAZAPI_TOKEN ||
    process.env.UAZAPI_TOKEN ||
    ''
  ).trim()
  if (!server || !token) return null
  return { server, token }
}

export function isSupportWhatsAppApiConfigured(): boolean {
  return Boolean(getUazapiConfig())
}

/**
 * Envia texto via Uazapi (instância do produto / suporte).
 * Destino padrão: SUPPORT_WHATSAPP_E164 (WhatsApp do Marcos).
 */
export async function notifySupportWhatsApp(text: string): Promise<{
  ok: boolean
  via: 'uazapi' | 'none'
  error?: string
}> {
  const cfg = getUazapiConfig()
  if (!cfg) {
    return { ok: false, via: 'none', error: 'uazapi_not_configured' }
  }

  const number = getSupportWhatsAppE164()
  const url = `${cfg.server}/send/text?token=${encodeURIComponent(cfg.token)}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number,
        text,
        readchat: true,
      }),
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300)
      return { ok: false, via: 'uazapi', error: `http_${res.status}:${body}` }
    }
    return { ok: true, via: 'uazapi' }
  } catch (e) {
    return {
      ok: false,
      via: 'uazapi',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
