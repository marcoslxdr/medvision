/**
 * Vision model router — Med Vision
 *
 * Preferência:
 * 1. ChatGPT OAuth (Codex backend) quando houver auth
 * 2. OpenCode Go (API key) como fallback / modelos open (Kimi)
 */

import {
  chatgptCodexMedVision,
  chatgptCodexProviderOptions,
  hasChatgptCodexAuthSync,
} from '@/lib/ai/chatgpt-codex'
import {
  DEFAULT_VISION_MODEL_CHAIN as OPENCODE_DEFAULT_CHAIN,
  MODELS as OPENCODE_MODELS,
  VISION_MODELS_LIST as OPENCODE_LIST,
  buildVisionModelChain as buildOpenCodeChain,
  hasMedVisionOpenCodeGoKey,
  opencodeGoMedVision,
  visionProviderOptions as openCodeVisionProviderOptions,
} from '@/lib/ai/opencode-go'

/** Primário: ChatGPT Luna (OAuth). Fallback open: Kimi via OpenCode Go. */
export const MODELS = {
  vision: 'gpt-5.6-luna',
  visionAlt: OPENCODE_MODELS.visionAlt, // kimi-k2.6
  visionFallback: OPENCODE_MODELS.visionFallback,
} as const

export type VisionModelId = (typeof MODELS)[keyof typeof MODELS]

export const VISION_MODELS_LIST = [
  {
    id: 'gpt-5.6-luna',
    name: 'ChatGPT GPT-5.6 Luna (max)',
    provider: hasChatgptCodexAuthSync() ? 'ChatGPT OAuth' : 'OpenCode Go',
  },
  ...OPENCODE_LIST.filter((m) => m.id !== 'gpt-5.6-luna'),
] as const

export const DEFAULT_VISION_MODEL_CHAIN = [MODELS.vision, MODELS.visionAlt] as const

export function hasMedVisionAuth(): boolean {
  return hasChatgptCodexAuthSync() || hasMedVisionOpenCodeGoKey()
}

/** @deprecated use hasMedVisionAuth */
export function hasMedVisionOpenCodeGoKeyCompat(): boolean {
  return hasMedVisionAuth()
}

function isOpenCodeOnlyModel(modelId: string): boolean {
  return (
    modelId.startsWith('kimi-') ||
    modelId.startsWith('glm-') ||
    modelId.startsWith('deepseek-') ||
    modelId.startsWith('qwen') ||
    modelId.startsWith('minimax-') ||
    modelId.startsWith('mimo-') ||
    modelId.startsWith('hy3') ||
    modelId.startsWith('grok-')
  )
}

function prefersChatgpt(modelId: string): boolean {
  if (isOpenCodeOnlyModel(modelId)) return false
  // GPT family → ChatGPT OAuth when available
  if (modelId.includes('gpt-') || modelId.includes('o3') || modelId.includes('o4')) {
    return hasChatgptCodexAuthSync()
  }
  return hasChatgptCodexAuthSync() && !isOpenCodeOnlyModel(modelId)
}

/**
 * Factory de modelo de visão.
 * Luna/GPT → ChatGPT OAuth se disponível; senão OpenCode Go.
 * Kimi e demais open → OpenCode Go.
 */
export function visionModel(modelId: string) {
  if (prefersChatgpt(modelId)) {
    return chatgptCodexMedVision(modelId)
  }
  return opencodeGoMedVision(modelId)
}

/** Alias legado usado pelo pipeline. */
export const opencodeGoMedVisionRouted = visionModel

export function visionProviderOptions(modelId: string): Record<string, unknown> | undefined {
  if (prefersChatgpt(modelId)) {
    return chatgptCodexProviderOptions(modelId)
  }
  return openCodeVisionProviderOptions(modelId)
}

export function buildVisionModelChain(selectedModel?: string | null): readonly string[] {
  // Reusa lógica de cadeia; default = Luna → Kimi
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
  // Se ChatGPT auth ausente e só OpenCode, ainda tenta Luna via Go
  if (!hasChatgptCodexAuthSync() && hasMedVisionOpenCodeGoKey()) {
    return buildOpenCodeChain(selectedModel)
  }
  return defaultModels
}

export { OPENCODE_DEFAULT_CHAIN }
