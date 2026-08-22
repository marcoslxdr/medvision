/**
 * ChatGPT Codex OAuth provider — Med Vision
 *
 * Backend: https://chatgpt.com/backend-api/codex (assinatura ChatGPT / OAuth Codex)
 * Requer stream:true; este fetch força SSE, bufferiza e devolve JSON final
 * compatível com o AI SDK (Responses).
 */

import { createOpenAI } from '@ai-sdk/openai'

export const CHATGPT_CODEX_BASE_URL = 'https://chatgpt.com/backend-api/codex'
const CODEX_OAUTH_TOKEN_URL = 'https://auth.openai.com/oauth/token'
const CODEX_OAUTH_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'

type TokenBundle = {
  accessToken: string
  refreshToken?: string
  accountId?: string
}

let memoryTokens: TokenBundle | null = null

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const b64 = parts[1]! + '='.repeat((4 - (parts[1]!.length % 4)) % 4)
    const json = Buffer.from(b64, 'base64url').toString('utf8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function accountIdFromAccessToken(accessToken: string): string | undefined {
  const claims = decodeJwtPayload(accessToken)
  if (!claims) return undefined
  const auth = claims['https://api.openai.com/auth']
  if (auth && typeof auth === 'object' && auth !== null) {
    const id = (auth as { chatgpt_account_id?: unknown }).chatgpt_account_id
    if (typeof id === 'string' && id.trim()) return id.trim()
  }
  return undefined
}

function isTokenExpiring(accessToken: string, skewSeconds = 120): boolean {
  const claims = decodeJwtPayload(accessToken)
  const exp = claims && typeof claims.exp === 'number' ? claims.exp : null
  if (!exp) return false
  return exp <= Math.floor(Date.now() / 1000) + skewSeconds
}

function envBundle(): TokenBundle | null {
  const accessToken =
    process.env.MEDVISION_CHATGPT_ACCESS_TOKEN?.trim() ||
    process.env.CHATGPT_ACCESS_TOKEN?.trim() ||
    process.env.OPENAI_CODEX_ACCESS_TOKEN?.trim() ||
    ''
  if (!accessToken) return null
  return {
    accessToken,
    refreshToken:
      process.env.MEDVISION_CHATGPT_REFRESH_TOKEN?.trim() ||
      process.env.CHATGPT_REFRESH_TOKEN?.trim() ||
      process.env.OPENAI_CODEX_REFRESH_TOKEN?.trim() ||
      undefined,
    accountId:
      process.env.MEDVISION_CHATGPT_ACCOUNT_ID?.trim() ||
      process.env.CHATGPT_ACCOUNT_ID?.trim() ||
      process.env.OPENAI_CODEX_ACCOUNT_ID?.trim() ||
      accountIdFromAccessToken(accessToken),
  }
}

/** Lê OAuth local do Hermes/Codex (dev/VPS). Não usa em edge. */
function localAuthBundle(): TokenBundle | null {
  if (process.env.MEDVISION_DISABLE_LOCAL_CHATGPT_AUTH === '1') return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path') as typeof import('node:path')
    const home = process.env.HOME || '/root'
    const candidates = [
      process.env.HERMES_AUTH_JSON_PATH,
      process.env.CODEX_AUTH_JSON_PATH,
      path.join(home, '.hermes/profiles/ranira/auth.json'),
      path.join(home, '.hermes/auth.json'),
      path.join(home, '.codex/auth.json'),
    ].filter(Boolean) as string[]

    for (const p of candidates) {
      if (!fs.existsSync(p)) continue
      const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>
      // Hermes shape
      const providers = raw.providers as
        | Record<string, { tokens?: Record<string, string> }>
        | undefined
      const hermesToks = providers?.['openai-codex']?.tokens
      if (hermesToks?.access_token) {
        return {
          accessToken: hermesToks.access_token,
          refreshToken: hermesToks.refresh_token,
          accountId: hermesToks.account_id || accountIdFromAccessToken(hermesToks.access_token),
        }
      }
      // Codex CLI shape
      const tokens = raw.tokens as Record<string, string> | undefined
      if (tokens?.access_token) {
        return {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accountId: tokens.account_id || accountIdFromAccessToken(tokens.access_token),
        }
      }
    }
  } catch {
    // ignore
  }
  return null
}

async function refreshAccessToken(refreshToken: string): Promise<TokenBundle | null> {
  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CODEX_OAUTH_CLIENT_ID,
    })
    const res = await fetch(CODEX_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'codex_cli_rs/0.0.0 (MedVision)',
      },
      body,
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      access_token?: string
      refresh_token?: string
    }
    if (!data.access_token) return null
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      accountId: accountIdFromAccessToken(data.access_token),
    }
  } catch {
    return null
  }
}

export async function resolveChatgptCodexTokens(): Promise<TokenBundle | null> {
  let bundle = memoryTokens || envBundle() || localAuthBundle()
  if (!bundle) return null

  if (isTokenExpiring(bundle.accessToken) && bundle.refreshToken) {
    const refreshed = await refreshAccessToken(bundle.refreshToken)
    if (refreshed) {
      memoryTokens = {
        ...refreshed,
        accountId: refreshed.accountId || bundle.accountId,
      }
      bundle = memoryTokens
    }
  } else {
    memoryTokens = bundle
  }
  return bundle
}

export function hasChatgptCodexAuthSync(): boolean {
  return Boolean(envBundle() || localAuthBundle() || memoryTokens)
}

export async function hasChatgptCodexAuth(): Promise<boolean> {
  return Boolean(await resolveChatgptCodexTokens())
}

function parseSseToFinalResponse(sseText: string): Record<string, unknown> {
  let lastCompleted: Record<string, unknown> | null = null
  let assembledText = ''
  let responseId = `resp_${Date.now()}`
  let model = 'gpt-5.6-luna'
  let usage: unknown = null

  const blocks = sseText.split(/\n\n+/)
  for (const block of blocks) {
    const dataLines = block
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim())
    if (!dataLines.length) continue
    const payload = dataLines.join('\n')
    if (!payload || payload === '[DONE]') continue
    let evt: Record<string, unknown>
    try {
      evt = JSON.parse(payload) as Record<string, unknown>
    } catch {
      continue
    }
    const type = String(evt.type || '')
    if (type === 'response.output_text.delta' && typeof evt.delta === 'string') {
      assembledText += evt.delta
    }
    if (type === 'response.output_text.done' && typeof evt.text === 'string') {
      assembledText = evt.text
    }
    if (type === 'response.completed' || type === 'response.incomplete') {
      const resp = (evt.response || {}) as Record<string, unknown>
      lastCompleted = resp
      if (typeof resp.id === 'string') responseId = resp.id
      if (typeof resp.model === 'string') model = resp.model
      if (resp.usage) usage = resp.usage
      // Prefer text from nested output if present
      const out = resp.output
      if (Array.isArray(out) && out.length) {
        const texts: string[] = []
        for (const item of out) {
          if (!item || typeof item !== 'object') continue
          const content = (item as { content?: unknown }).content
          if (!Array.isArray(content)) continue
          for (const c of content) {
            if (
              c &&
              typeof c === 'object' &&
              typeof (c as { text?: unknown }).text === 'string' &&
              ((c as { type?: string }).type === 'output_text' ||
                (c as { type?: string }).type === 'text')
            ) {
              texts.push((c as { text: string }).text)
            }
          }
        }
        if (texts.join('').trim()) assembledText = texts.join('')
      }
    }
    if (type === 'response.created') {
      const resp = (evt.response || {}) as Record<string, unknown>
      if (typeof resp.id === 'string') responseId = resp.id
      if (typeof resp.model === 'string') model = resp.model
    }
  }

  // Codex often returns output:[] on completed; rebuild message from SSE text
  const output =
    Array.isArray(lastCompleted?.output) && (lastCompleted!.output as unknown[]).length
      ? lastCompleted!.output
      : [
          {
            type: 'message',
            id: `msg_${Date.now()}`,
            status: 'completed',
            role: 'assistant',
            content: [
              {
                type: 'output_text',
                text: assembledText,
                annotations: [],
              },
            ],
          },
        ]

  const base = { ...(lastCompleted || {}) } as Record<string, unknown>
  return {
    ...base,
    id: responseId,
    object: 'response',
    created_at:
      typeof base.created_at === 'number'
        ? base.created_at
        : Math.floor(Date.now() / 1000),
    status: 'completed',
    model,
    output,
    usage: usage || base.usage || null,
  }
}

async function chatgptCodexFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const tokens = await resolveChatgptCodexTokens()
  if (!tokens?.accessToken) {
    return new Response(JSON.stringify({ error: 'chatgpt_codex_auth_missing' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const url = String(input)
  const headers = new Headers(init?.headers || {})
  headers.set('Authorization', `Bearer ${tokens.accessToken}`)
  headers.set('User-Agent', 'codex_cli_rs/0.0.0 (MedVision)')
  headers.set('originator', 'codex_cli_rs')
  const accountId = tokens.accountId || accountIdFromAccessToken(tokens.accessToken)
  if (accountId) headers.set('ChatGPT-Account-ID', accountId)

  let body = init?.body
  const isResponses =
    url.includes('/responses') || (typeof body === 'string' && body.includes('"model"'))

  if (isResponses && typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>
      parsed.stream = true
      parsed.store = false
      // Codex backend rejects these
      delete parsed.max_output_tokens
      delete parsed.max_tokens
      delete parsed.temperature
      delete parsed.top_p
      body = JSON.stringify(parsed)
      headers.set('Accept', 'text/event-stream')
      headers.set('Content-Type', 'application/json')
    } catch {
      // keep original body
    }
  }

  const res = await fetch(url, {
    ...init,
    headers,
    body,
    cache: 'no-store',
  })

  const contentType = res.headers.get('content-type') || ''
  if (
    contentType.includes('text/event-stream') ||
    (isResponses && res.ok && !(contentType.includes('application/json')))
  ) {
    const sseText = await res.text()
    const finalJson = parseSseToFinalResponse(sseText)
    return new Response(JSON.stringify(finalJson), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Some errors still JSON
  return res
}

const chatgptCodexProvider = createOpenAI({
  name: 'chatgpt-codex',
  baseURL: CHATGPT_CODEX_BASE_URL,
  apiKey: 'codex-oauth', // real token injected in fetch
  fetch: chatgptCodexFetch as typeof fetch,
  headers: {
    'X-Title': 'MedVision - Image Analysis (ChatGPT)',
  },
})

/** Modelo Responses via OAuth ChatGPT/Codex. */
export const chatgptCodexMedVision = (modelId: string) =>
  chatgptCodexProvider.responses(modelId)

/** Provider options — effort max no Luna (não empilhar em *-pro). */
export function chatgptCodexProviderOptions(modelId: string): Record<string, unknown> | undefined {
  if (modelId.endsWith('-pro')) {
    return {
      'chatgpt-codex': {
        forceReasoning: true,
        reasoningSummary: null,
        store: false,
      },
    }
  }
  if (modelId.includes('gpt-5.6-luna') || modelId.includes('gpt-5')) {
    return {
      'chatgpt-codex': {
        reasoningEffort: 'max',
        forceReasoning: true,
        reasoningSummary: null,
        store: false,
      },
    }
  }
  return {
    'chatgpt-codex': {
      forceReasoning: true,
      store: false,
    },
  }
}
