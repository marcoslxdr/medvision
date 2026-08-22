/**
 * Logs estruturados de análise de imagem (Med Vision).
 *
 * Cada chamada registra: tokens, latência, custo, schema validation result.
 * Desative mensagens informativas com MEDVISION_VISION_LOG=0 (erros/avisos críticos continuam).
 */

const PREFIX = '[vision]'

export function visionInfoEnabled(): boolean {
    return process.env.MEDVISION_VISION_LOG !== '0'
}

export type VisionLogFields = Record<string, string | number | boolean | null | undefined>

function stamp(fields?: VisionLogFields) {
    return { t: new Date().toISOString(), ...fields }
}

export function visionInfo(msg: string, fields?: VisionLogFields) {
    if (!visionInfoEnabled()) return
    if (fields && Object.keys(fields).length > 0) {
        console.log(PREFIX, msg, stamp(fields))
    } else {
        console.log(PREFIX, msg, stamp())
    }
}

/** Avisos do pipeline (sempre emitidos, para operação e debugging). */
export function visionWarn(msg: string, fields?: VisionLogFields) {
    if (fields && Object.keys(fields).length > 0) {
        console.warn(PREFIX, msg, stamp(fields))
    } else {
        console.warn(PREFIX, msg, stamp())
    }
}

export function visionError(msg: string, err?: unknown, fields?: VisionLogFields) {
    const base = fields && Object.keys(fields).length > 0 ? stamp(fields) : stamp()
    if (err instanceof Error) {
        const includeStack = process.env.NODE_ENV === 'development' && process.env.MEDVISION_VISION_LOG_STACK === '1'
        console.error(PREFIX, msg, { ...base, name: err.name, message: err.message, ...(includeStack ? { stack: err.stack } : {}) })
    } else if (err !== undefined) {
        console.error(PREFIX, msg, { ...base, detail: String(err) })
    } else {
        console.error(PREFIX, msg, base)
    }
}

export function imagePayloadStats(imageData: string) {
    const chars = imageData.length
    const approxBytes = Math.round(chars * 0.75)
    const approxMb = Math.round((approxBytes / (1024 * 1024)) * 100) / 100
    return { payloadChars: chars, approxBytes, approxMb }
}

export function getStructuredVisionOutputFromEnv(): boolean {
    return process.env.MEDVISION_STRUCTURED_OUTPUT !== '0'
}

export function elapseMs(start: number): number {
    return Math.round(performance.now() - start)
}

// ── Structured logging (entregável 5) ──

export interface VisionCallLog {
    requestId: string
    modelId: string
    phase: string // 'single_pass' | 'quick_detection' | 'detailed' | 'refine' | 'two_stage'
    attempt: number
    totalAttempts: number
    /** Latência da chamada IA em ms */
    latencyMs: number
    /** Tokens usados (quando disponível via AI SDK response metadata) */
    tokens?: { input: number; output: number }
    /** Custo estimado em USD */
    costEstimate?: number
    /** Se structured output foi usado */
    structuredOutput: boolean
    /** Schema validation: 'pass' | 'fallback_heuristic' | 'fallback_text' | 'fail' */
    schemaValidation: 'pass' | 'fallback_heuristic' | 'fallback_text' | 'fail'
    /** Se cache foi usado */
    cacheHit: boolean
    /** Tamanho do payload da imagem em bytes aproximados */
    payloadBytes?: number
    /** Se houve compressão agressiva */
    wasCompressed: boolean
    /** Modo da análise */
    mode: string
    /** Contexto clínico presente */
    hasClinicalContext: boolean
    /** Duração total do request (incluindo preprocessamento) em ms */
    totalRequestMs: number
}

export function logVisionCall(log: VisionCallLog): void {
    visionInfo('call.complete', {
        requestId: log.requestId,
        modelId: log.modelId,
        phase: log.phase,
        attempt: log.attempt,
        totalAttempts: log.totalAttempts,
        latencyMs: log.latencyMs,
        tokensIn: log.tokens?.input ?? 0,
        tokensOut: log.tokens?.output ?? 0,
        costEstimate: log.costEstimate ?? 0,
        structuredOutput: log.structuredOutput,
        schemaValidation: log.schemaValidation,
        cacheHit: log.cacheHit,
        payloadBytes: log.payloadBytes ?? 0,
        wasCompressed: log.wasCompressed,
        mode: log.mode,
        hasClinicalContext: log.hasClinicalContext,
        totalRequestMs: log.totalRequestMs,
    })
}

/**
 * Estima custo baseado em tokens e modelo.
 * Preços aproximados via OpenCode Go (verificar periodicamente).
 */
const MODEL_PRICING: Record<string, { inputPerMtok: number; outputPerMtok: number }> = {
    // OpenCode Go — GPT-5.6 Luna (≤272K context band)
    'gpt-5.6-luna': { inputPerMtok: 0.2, outputPerMtok: 1.2 },
    'kimi-k2.6': { inputPerMtok: 0.95, outputPerMtok: 4.0 },
    'kimi-k2.7-code': { inputPerMtok: 0.95, outputPerMtok: 4.0 },
}

const DEFAULT_PRICING = { inputPerMtok: 1.0, outputPerMtok: 4.0 }

export function estimateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number,
): number {
    const pricing = MODEL_PRICING[modelId] ?? DEFAULT_PRICING
    return (
        (inputTokens / 1_000_000) * pricing.inputPerMtok +
        (outputTokens / 1_000_000) * pricing.outputPerMtok
    )
}

/** Extrai uso de tokens do response da AI SDK quando disponível */
export function extractTokenUsage(response: unknown): { input: number; output: number } | undefined {
    if (!response || typeof response !== 'object') return undefined
    const r = response as { usage?: { promptTokens?: number; completionTokens?: number } }
    if (r.usage && (r.usage.promptTokens || r.usage.completionTokens)) {
        return {
            input: r.usage.promptTokens ?? 0,
            output: r.usage.completionTokens ?? 0,
        }
    }
    return undefined
}
