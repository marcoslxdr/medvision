/**
 * OpenCode Go Provider — Med Vision (análise de imagem)
 *
 * API OpenAI-compatible em https://opencode.ai/zen/go/v1
 * Docs: https://opencode.ai/docs/go/
 *
 * - GPT-5.6 Luna: Responses API + reasoningEffort max
 * - Kimi e demais open models: Chat Completions (`.chat()`)
 */

import { createOpenAI } from '@ai-sdk/openai'

const OPENCODE_GO_BASE_URL = 'https://opencode.ai/zen/go/v1'

const openCodeGoHeaders = {
  'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'X-Title': 'MedVision',
} as const

/** Aceita aliases usados em runtime Hermes / Vercel. */
function resolveMedVisionOpenCodeGoKey(): string | undefined {
  return (
    process.env.MEDVISION_OPENCODE_API_KEY?.trim() ||
    process.env.OPENCODE_API_KEY?.trim() ||
    process.env.OPENCODE_GO_API_KEY?.trim() ||
    undefined
  )
}

const medVisionOpenCodeGoKey = resolveMedVisionOpenCodeGoKey()

const opencodeGoMedVisionProvider = createOpenAI({
  name: 'opencode-go-medvision',
  baseURL: OPENCODE_GO_BASE_URL,
  apiKey: medVisionOpenCodeGoKey,
  headers: {
    ...openCodeGoHeaders,
    'X-Title': 'MedVision - Image Analysis',
  },
})

/** Modelos que usam Responses API no OpenCode Go (não Chat Completions). */
const RESPONSES_API_MODEL_IDS = new Set(['gpt-5.6-luna'])

/**
 * Factory de modelo OpenCode Go.
 * - `gpt-5.6-luna` → Responses API (endpoint oficial Go)
 * - demais → Chat Completions
 */
export const opencodeGoMedVision = (modelId: string) => {
  if (RESPONSES_API_MODEL_IDS.has(modelId)) {
    return opencodeGoMedVisionProvider.responses(modelId)
  }
  return opencodeGoMedVisionProvider.chat(modelId)
}

/** True se a rota de visão tiver chave OpenCode Go disponível. */
export function hasMedVisionOpenCodeGoKey(): boolean {
  return Boolean(resolveMedVisionOpenCodeGoKey())
}

/** Modelos de visão via OpenCode Go (multimodal) */
export const MODELS = {
  /** Primário: ChatGPT GPT-5.6 Luna (effort max no pipeline) */
  vision: 'gpt-5.6-luna',
  /** Fallback multimodal open */
  visionAlt: 'kimi-k2.6',
  visionFallback: 'kimi-k2.7-code',
} as const

export type VisionModelId = (typeof MODELS)[keyof typeof MODELS]

export const VISION_MODELS_LIST = [
  { id: 'gpt-5.6-luna', name: 'ChatGPT GPT-5.6 Luna (max)', provider: 'OpenCode Go' },
  { id: 'kimi-k2.6', name: 'Kimi k2.6', provider: 'OpenCode Go' },
  { id: 'kimi-k2.7-code', name: 'Kimi k2.7 Code', provider: 'OpenCode Go' },
] as const

export type VisionModelInfo = (typeof VISION_MODELS_LIST)[number]
export const VISION_MODEL_IDS = new Set(VISION_MODELS_LIST.map((m) => m.id))

/** Cadeia padrão Med Vision: GPT-5.6 Luna → Kimi k2.6 */
export const DEFAULT_VISION_MODEL_CHAIN = [MODELS.vision, MODELS.visionAlt] as const

/**
 * Provider options para análise de imagem.
 * Luna Max = reasoningEffort: 'max' na Responses API.
 * forceReasoning: baseURL custom (OpenCode Go) — o SDK trata como reasoning model.
 */
export function visionProviderOptions(modelId: string): Record<string, unknown> | undefined {
  if (modelId === MODELS.vision || modelId === 'gpt-5.6-luna') {
    return {
      'opencode-go-medvision': {
        reasoningEffort: 'max',
        forceReasoning: true,
        // laudos clínicos: não precisamos do summary no stream
        reasoningSummary: null,
      },
    }
  }
  return undefined
}

/**
 * Retorna a cadeia de modelos com fallback.
 * Se o modelo selecionado for diferente do padrão, usa ele como primeiro e os defaults como fallback.
 */
export function buildVisionModelChain(selectedModel?: string | null): readonly string[] {
  const defaultModels = [...DEFAULT_VISION_MODEL_CHAIN]

  if (
    selectedModel &&
    selectedModel !== MODELS.vision &&
    selectedModel !== MODELS.visionAlt
  ) {
    return [selectedModel, ...defaultModels]
  }

  if (selectedModel === MODELS.visionAlt) {
    return [MODELS.visionAlt, MODELS.vision]
  }

  return defaultModels
}

/** Configuração otimizada para análise de imagem (vision) */
export const VISION_CONFIG = {
  temperature: 0.5,
  maxTokens: 10000,
  topP: 0.9,
} as const
