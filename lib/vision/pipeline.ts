import { generateObject, generateText } from 'ai'
import * as Sentry from '@sentry/nextjs'
import type { z } from 'zod'
import type { ZodType } from 'zod'
import {
    visionModel as opencodeGoMedVision,
    DEFAULT_VISION_MODEL_CHAIN,
    visionProviderOptions,
} from '@/lib/ai/vision-model'
import type { SpecialtyPrompts } from '@/lib/constants/vision-specialties'
import { validateAndMergeDetections } from '@/lib/vision/detection-validation'
import { extractJSON, sanitizeClinicalContext } from '@/lib/vision/json-utils'
import { callWithFallback } from '@/lib/vision/model-fallback'
import {
    elapseMs,
    imagePayloadStats,
    getStructuredVisionOutputFromEnv as structuredVisionOutputFromEnv,
    visionInfo,
    visionWarn,
} from '@/lib/vision/vision-log'
import {
    DETAILED_ANALYSIS_PROMPT,
    DETAILED_ANALYSIS_SCHEMA,
    FEW_SHOT_EXAMPLES,
    JSON_SCHEMA_EXAMPLE,
    QUICK_DETECTION_PROMPT,
    QUICK_DETECTION_SCHEMA,
    SYSTEM_PROMPT_BASE,
} from '@/lib/vision/prompts'
import { DetailedDetectionSchema, QuickDetectionSchema, VisionSchema, type VisionAnalysis } from '@/lib/vision/schemas'

export const VISION_MODELS = DEFAULT_VISION_MODEL_CHAIN

/** Tracks consecutive structured output failures per model for alerting (P1-8). */
const structuredOutputFailures = new Map<string, number>()
const STRUCTURED_OUTPUT_BACKOFF_COUNT = 3

export class ImageInadequateError extends Error {
    details: string
    constructor(reason: string, details: string) {
        super(`inadequate_image: ${reason}`)
        this.name = 'ImageInadequateError'
        this.details = details
    }
}

function checkImageAdequacy(imageData: string): { adequate: boolean; reason: string; details: string } {
    const chars = imageData.length
    const approxBytes = Math.round(chars * 0.75)

    if (approxBytes < 5000) {
        return {
            adequate: false,
            reason: 'Imagem corrompida ou com dados insuficientes.',
            details: `Tamanho: ~${approxBytes} bytes. Mínimo: 5KB.`,
        }
    }

    if (approxBytes > 50 * 1024 * 1024) {
        return {
            adequate: false,
            reason: 'Imagem muito grande para análise.',
            details: `Tamanho: ~${Math.round(approxBytes / 1024 / 1024)}MB. Máximo recomendado: 50MB.`,
        }
    }

    const base64Header = imageData.match(/^data:image\/(\w+);base64,/)
    if (!base64Header) {
        return {
            adequate: false,
            reason: 'Formato de imagem inválido.',
            details: 'A imagem deve estar no formato data URL (base64).',
        }
    }

    const mimeType = base64Header[1]
    if (!['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp'].includes(mimeType.toLowerCase())) {
        return {
            adequate: false,
            reason: 'Tipo de imagem não suportado.',
            details: `Formato: ${mimeType}. Suportados: JPEG, PNG, WebP, GIF, BMP.`,
        }
    }

    return { adequate: true, reason: '', details: '' }
}

async function checkImageAdequacyAsync(imageData: string): Promise<{ adequate: boolean; reason: string; details: string }> {
    return checkImageAdequacy(imageData)
}

/** Imagem antes do texto: vários provedores (ex. GLM via OpenRouter) falham com 400 se a ordem for invertida. */
function buildUserContent(imageData: string, textParts: { type: 'text'; text: string }[]) {
    return [{ type: 'image' as const, image: imageData }, ...textParts]
}

type SeriesFrameInput = { dataUrl: string; label?: string }

/** Conteúdo multi-corte: rótulo + imagem por frame, depois instruções. */
function buildSeriesUserContent(
    frames: SeriesFrameInput[],
    textParts: { type: 'text'; text: string }[],
) {
    const parts: Array<
        { type: 'image'; image: string } | { type: 'text'; text: string }
    > = []
    for (let i = 0; i < frames.length; i++) {
        const f = frames[i]!
        const label =
            f.label ||
            `[Corte ${i + 1}/${frames.length}]`
        parts.push({ type: 'text', text: label })
        parts.push({ type: 'image', image: f.dataUrl })
    }
    parts.push(...textParts)
    return parts
}

function contextLogFields(userContext?: string | null, clinicalContext?: string) {
    const trimmedUser = userContext?.trim()
    const safeContext = clinicalContext?.trim() ? sanitizeClinicalContext(clinicalContext) : null
    return {
        hasClinicalContext: Boolean(trimmedUser || safeContext),
        clinicalContextChars: trimmedUser?.length ?? safeContext?.length ?? 0,
    }
}

function appendUserContextParts(
    userTextParts: { type: 'text'; text: string }[],
    options: {
        userContext?: string | null
        clinicalContext?: string
        legacyFormat?: 'full' | 'short'
    },
) {
    if (options.userContext?.trim()) {
        userTextParts.push({ type: 'text' as const, text: options.userContext.trim() })
        return
    }
    const safeContext = options.clinicalContext?.trim() ? sanitizeClinicalContext(options.clinicalContext) : null
    if (!safeContext) return
    // Wrapping em XML delimiters conforme instruções no prompt do sistema (P1-2)
    if (options.legacyFormat === 'full') {
        userTextParts.push({
            type: 'text' as const,
            text: `<clinical_context>
${safeContext}
</clinical_context>`,
        })
    } else {
        userTextParts.push({ type: 'text' as const, text: `<clinical_context>${safeContext}</clinical_context>` })
    }
}

function coerceBoxToPercent(box: unknown, scaleHint?: number): number[] | null {
    if (!Array.isArray(box) || box.length !== 4) return null
    const nums = box.map((v) => (typeof v === 'number' ? v : Number.NaN))
    if (nums.some((n) => !Number.isFinite(n))) return null

    // Caso 0–1: normaliza para 0–100
    const max = Math.max(...nums)
    let scale = 1
    if (max > 0 && max <= 1.5) {
        scale = 100
    } else if (max > 100) {
        // Caso provável em pixels (ou escala arbitrária): usa maior valor observado como referência.
        const ref = scaleHint && scaleHint > 0 ? scaleHint : max
        scale = 100 / ref
    }

    const scaled = nums.map((n) => n * scale)
    const ymin = Math.min(scaled[0], scaled[2])
    const ymax = Math.max(scaled[0], scaled[2])
    const xmin = Math.min(scaled[1], scaled[3])
    const xmax = Math.max(scaled[1], scaled[3])

    return [
        Math.max(0, Math.min(100, ymin)),
        Math.max(0, Math.min(100, xmin)),
        Math.max(0, Math.min(100, ymax)),
        Math.max(0, Math.min(100, xmax)),
    ]
}

function normalizeQuickDetectionPayload(payload: unknown): unknown {
    if (!payload || typeof payload !== 'object') return payload
    const p = payload as {
        quickDetections?: unknown
    }
    if (!Array.isArray(p.quickDetections)) return payload

    // Maior coordenada observada (heurística para "pixels" / escala > 100).
    let globalMax = 0
    for (const det of p.quickDetections) {
        if (!det || typeof det !== 'object') continue
        const b = (det as { box?: unknown }).box
        if (Array.isArray(b)) {
            for (const v of b) {
                const n = typeof v === 'number' ? v : NaN
                if (Number.isFinite(n)) globalMax = Math.max(globalMax, n)
            }
        }
    }

    const normalized = p.quickDetections.map((det) => {
        if (!det || typeof det !== 'object') return det
        const d = det as { box?: unknown }
        const coerced = coerceBoxToPercent(d.box, globalMax > 100 ? globalMax : undefined)
        return coerced ? { ...(det as Record<string, unknown>), box: coerced } : det
    })

    return { ...(payload as Record<string, unknown>), quickDetections: normalized }
}

function structuredVisionOutputEnabled(): boolean {
    return structuredVisionOutputFromEnv()
}

/** Tentativa de parse com múltiplas heurísticas para lidar com respostas mal formatadas. */
function parseWithHeuristics(text: string): unknown {
    try {
        return extractJSON(text)
    } catch {
        // Tenta extrair apenas a parte relevante
        const match = text.match(/(?:\{[\s\S]*\}|\[[\s\S]*\])/)
        if (match) {
            try {
                return JSON.parse(match[0])
            } catch {
                /* tenta Repair */
            }
        }
        // Tenta JSON simples como último recurso
        try {
            return JSON.parse(text)
        } catch {
            return null
        }
    }
}

/**
 * Se o modelo falhou structured output STRUCTURED_OUTPUT_BACKOFF_COUNT+ vezes consecutivas,
 * pula structured output para evitar timeout desperdiçado (P1-8).
 */
function shouldSkipStructuredOutput(modelId: string): boolean {
    const failures = structuredOutputFailures.get(modelId) ?? 0
    return failures >= STRUCTURED_OUTPUT_BACKOFF_COUNT
}

async function tryGenerateObject<T>(
    schema: ZodType<T>,
    modelId: string,
    signal: AbortSignal,
    maxOutputTokens: number,
    systemContent: string,
    userContent: ReturnType<typeof buildUserContent>,
    phase: string,
): Promise<T | null> {
    if (!structuredVisionOutputEnabled()) {
        visionInfo('skip_structured', { phase, reason: 'MEDVISION_STRUCTURED_OUTPUT=0' })
        return null
    }
    if (shouldSkipStructuredOutput(modelId)) {
        visionInfo('skip_structured', { phase, modelId, reason: `backoff_after_${STRUCTURED_OUTPUT_BACKOFF_COUNT}_consecutive_failures` })
        return null
    }
    const t0 = performance.now()
    try {
        const { object } = await generateObject({
            model: opencodeGoMedVision(modelId),
            schema,
            abortSignal: signal,
            maxOutputTokens,
            providerOptions: visionProviderOptions(modelId) as any,
            messages: [
                { role: 'system' as const, content: systemContent },
                { role: 'user' as const, content: userContent },
            ],
        })
        // Reset counter on success
        structuredOutputFailures.delete(modelId)
        visionInfo('structured_output.ok', { phase, modelId, maxOutputTokens, ms: elapseMs(t0) })
        return object
    } catch (e) {
        const failures = (structuredOutputFailures.get(modelId) ?? 0) + 1
        structuredOutputFailures.set(modelId, failures)
        const wasAlerted = failures >= STRUCTURED_OUTPUT_BACKOFF_COUNT
        visionInfo('structured_output.failed', {
            phase,
            modelId,
            ms: elapseMs(t0),
            consecutiveFailures: failures,
            alerting: wasAlerted,
            message: e instanceof Error ? e.message.slice(0, 400) : String(e).slice(0, 400),
        })
        if (wasAlerted) {
            Sentry.captureMessage(`Vision structured output backoff: ${modelId} failed ${failures}x consecutively`, {
                level: 'warning',
                extra: { phase, modelId, consecutiveFailures: failures },
            })
        }
        return null
    }
}

export async function callVisionAI(
    imageData: string,
    clinicalContext?: string,
    models: readonly string[] = VISION_MODELS,
    prompts?: SpecialtyPrompts,
    userContext?: string | null,
): Promise<VisionAnalysis> {
    const inadequateCheck = await checkImageAdequacyAsync(imageData)
    if (!inadequateCheck.adequate) {
        throw new ImageInadequateError(inadequateCheck.reason, inadequateCheck.details)
    }

    const activeSystemPrompt = prompts?.systemPrompt ?? SYSTEM_PROMPT_BASE

    const fullInstruction =
        prompts?.fullAnalysisUserInstruction ??
        'Gere um laudo de radiografia ou TC completo no JSON exigido pelo assistente. Responda SOMENTE com o JSON.'

    const generateWithModel = async (modelId: string, signal: AbortSignal): Promise<VisionAnalysis> => {
        const img = imagePayloadStats(imageData)
        visionInfo('pipeline.full.start', {
            modelId,
            ...img,
            ...contextLogFields(userContext, clinicalContext),
        })

        const userTextParts: { type: 'text'; text: string }[] = [
            {
                type: 'text' as const,
                text: fullInstruction,
            },
        ]
        appendUserContextParts(userTextParts, { userContext, clinicalContext, legacyFormat: 'full' })

        const systemContent = `${activeSystemPrompt}

FORMATO DE RESPOSTA: Responda SOMENTE com JSON válido seguindo este schema exato:
${JSON_SCHEMA_EXAMPLE}

EXEMPLOS DE REFERÊNCIA (few-shot):
${FEW_SHOT_EXAMPLES}

NÃO inclua markdown, code blocks, ou texto fora do JSON.`

        const userContent = buildUserContent(imageData, userTextParts)
        const structured = await tryGenerateObject(VisionSchema, modelId, signal, 8000, systemContent, userContent, 'full_analysis')
        if (structured) {
            visionInfo('pipeline.full.done', { modelId, path: 'structured' })
            return structured
        }

        const tText = performance.now()
        const result = await generateText({
            model: opencodeGoMedVision(modelId),
            abortSignal: signal,
            maxOutputTokens: 10000,
            providerOptions: visionProviderOptions(modelId) as any,
            messages: [
                {
                    role: 'system' as const,
                    content: systemContent,
                },
                {
                    role: 'user' as const,
                    content: userContent,
                },
            ],
        })
        const finishReason =
            'finishReason' in result && typeof (result as { finishReason?: unknown }).finishReason === 'string'
                ? (result as { finishReason: string }).finishReason
                : undefined
        visionInfo('text_path.ok', {
            phase: 'full_analysis',
            modelId,
            textChars: result.text.length,
            ms: elapseMs(tText),
            ...(finishReason ? { finishReason } : {}),
        })
        if (!result.text.trim()) {
            throw new Error('empty_response_from_model')
        }

        // Parse com heurísticas mais flexíveis
        const parsed = parseWithHeuristics(result.text)
        if (parsed) {
            visionInfo('pipeline.full.done', { modelId, path: 'text_fallback' })
            return VisionSchema.parse(parsed)
        }

        // Último recurso: tentar extrair mesmo mal formatado
        try {
            const extracted = extractJSON(result.text)
            visionInfo('pipeline.full.done', { modelId, path: 'extract_fallback' })
            return VisionSchema.parse(extracted)
        } catch (e) {
            visionWarn('pipeline.full.parse_failed', {
                modelId,
                message: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200),
                textPreview: result.text.slice(0, 500),
            })
            throw new Error('parse_failed_after_fallbacks')
        }
    }

    const payloadBytes = imageData.length
    return callWithFallback(models, generateWithModel, { estimatedPayloadBytes: payloadBytes })
}

export type VisionSeriesOptions = {
    clinicalContext?: string
    models?: readonly string[]
    prompts?: SpecialtyPrompts
    userContext?: string | null
    /** system addendum (ex. CT vídeo) */
    systemAddendum?: string
    fullInstruction?: string
    timestampsSec?: number[]
}

/**
 * Análise multi-corte (série TC / frames de vídeo).
 * Envia todos os frames numa única chamada ao modelo de visão.
 */
export async function callVisionSeriesAI(
    frameDataUrls: string[],
    options: VisionSeriesOptions = {},
): Promise<VisionAnalysis> {
    if (!frameDataUrls.length) {
        throw new Error('series_empty')
    }
    const models = options.models ?? VISION_MODELS
    const clinicalContext = options.clinicalContext
    const userContext = options.userContext
    const prompts = options.prompts

    // Adequação do primeiro frame (representativo)
    const inadequateCheck = await checkImageAdequacyAsync(frameDataUrls[0]!)
    if (!inadequateCheck.adequate) {
        throw new ImageInadequateError(inadequateCheck.reason, inadequateCheck.details)
    }

    const frames: SeriesFrameInput[] = frameDataUrls.map((dataUrl, i) => {
        const t = options.timestampsSec?.[i]
        const tLabel = t != null && Number.isFinite(t) ? ` · t=${Number(t).toFixed(2)}s` : ''
        return {
            dataUrl,
            label: `[Corte ${i + 1}/${frameDataUrls.length}${tLabel}]`,
        }
    })

    const baseSystem = prompts?.systemPrompt ?? SYSTEM_PROMPT_BASE
    const activeSystemPrompt = options.systemAddendum
        ? `${baseSystem}\n\n${options.systemAddendum}`
        : baseSystem

    const fullInstruction =
        options.fullInstruction ||
        prompts?.fullAnalysisUserInstruction ||
        `Analise a SÉRIE multi-corte (${frameDataUrls.length} frames). Gere laudo completo no JSON exigido, integrando achados ao longo da série. Responda SOMENTE com o JSON.`

    const generateWithModel = async (modelId: string, signal: AbortSignal): Promise<VisionAnalysis> => {
        const approxBytes = frameDataUrls.reduce((acc, u) => acc + Math.floor(u.length * 0.75), 0)
        visionInfo('pipeline.series.start', {
            modelId,
            frameCount: frameDataUrls.length,
            approxBytes,
            ...contextLogFields(userContext, clinicalContext),
        })

        const userTextParts: { type: 'text'; text: string }[] = [
            { type: 'text' as const, text: fullInstruction },
        ]
        appendUserContextParts(userTextParts, { userContext, clinicalContext, legacyFormat: 'full' })

        const systemContent = `${activeSystemPrompt}

FORMATO DE RESPOSTA: Responda SOMENTE com JSON válido seguindo este schema exato:
${JSON_SCHEMA_EXAMPLE}

NÃO inclua markdown, code blocks, ou texto fora do JSON.`

        const userContent = buildSeriesUserContent(frames, userTextParts)

        // structured costuma falhar em multi-image; tenta e cai para texto
        const structured = await tryGenerateObject(
            VisionSchema,
            modelId,
            signal,
            8000,
            systemContent,
            userContent as any,
            'series_analysis',
        )
        if (structured) {
            visionInfo('pipeline.series.done', { modelId, path: 'structured', frameCount: frames.length })
            return structured
        }

        const tText = performance.now()
        const result = await generateText({
            model: opencodeGoMedVision(modelId),
            abortSignal: signal,
            maxOutputTokens: 10000,
            providerOptions: visionProviderOptions(modelId) as any,
            messages: [
                { role: 'system' as const, content: systemContent },
                { role: 'user' as const, content: userContent as any },
            ],
        })
        visionInfo('text_path.ok', {
            phase: 'series_analysis',
            modelId,
            textChars: result.text.length,
            ms: elapseMs(tText),
            frameCount: frames.length,
        })
        if (!result.text.trim()) throw new Error('empty_response_from_model')

        const parsed = parseWithHeuristics(result.text)
        if (parsed) {
            visionInfo('pipeline.series.done', { modelId, path: 'text_fallback', frameCount: frames.length })
            return VisionSchema.parse(parsed)
        }
        try {
            const extracted = extractJSON(result.text)
            visionInfo('pipeline.series.done', { modelId, path: 'extract_fallback', frameCount: frames.length })
            return VisionSchema.parse(extracted)
        } catch (e) {
            visionWarn('pipeline.series.parse_failed', {
                modelId,
                message: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200),
                textPreview: result.text.slice(0, 500),
            })
            throw new Error('parse_failed_after_fallbacks')
        }
    }

    const payloadBytes = frameDataUrls.reduce((a, u) => a + u.length, 0)
    return callWithFallback(models, generateWithModel, { estimatedPayloadBytes: payloadBytes })
}

export async function callVisionRefinement(
    regionImageData: string,
    originalAnalysisSummary: string,
    clinicalContext?: string,
    models: readonly string[] = VISION_MODELS,
    prompts?: SpecialtyPrompts,
    userContext?: string | null,
): Promise<VisionAnalysis> {
    const activeSystemPrompt = prompts?.systemPrompt ?? SYSTEM_PROMPT_BASE

    const generateWithModel = async (modelId: string, signal: AbortSignal): Promise<VisionAnalysis> => {
        const img = imagePayloadStats(regionImageData)
        visionInfo('pipeline.refine.start', {
            modelId,
            ...img,
            ...contextLogFields(userContext, clinicalContext),
            originalSummaryChars: originalAnalysisSummary.length,
        })

        const userTextParts: { type: 'text'; text: string }[] = [
            {
                type: 'text' as const,
                text: 'RE-ANALISE esta região específica com máximo detalhe e precisão. Identifique achados sutis, forneça descrições técnicas aprofundadas, CID-10, diagnósticos diferenciais e ações recomendadas. As coordenadas devem ser relativas a esta imagem recortada. Responda SOMENTE com o JSON.',
            },
        ]
        appendUserContextParts(userTextParts, { userContext, clinicalContext, legacyFormat: 'short' })

        const systemContent = `${activeSystemPrompt}

MODO DE REFINAMENTO: Você está re-analisando uma REGIÃO ESPECÍFICA extraída de uma imagem médica maior (radiografia ou tomografia).
A análise original da imagem completa identificou: ${originalAnalysisSummary}

Sua tarefa agora é:
1. Focar EXCLUSIVAMENTE nesta região recortada com máximo detalhe
2. Identificar achados sutis que podem ter passado despercebidos na análise completa
3. Fornecer descrições ainda mais detalhadas dos achados visíveis nesta região
4. As coordenadas de bounding box devem ser relativas a ESTA imagem recortada (0-100)
5. Para imagens dentárias, detalhe cáries e perda óssea; para demais regiões, use terminologia radiológica adequada.

FORMATO DE RESPOSTA: Responda SOMENTE com JSON válido seguindo este schema exato:
${JSON_SCHEMA_EXAMPLE}

NÃO inclua markdown, code blocks, ou texto fora do JSON.`

        const userContent = buildUserContent(regionImageData, userTextParts)
        const structured = await tryGenerateObject(VisionSchema, modelId, signal, 4000, systemContent, userContent, 'refinement')
        if (structured) {
            visionInfo('pipeline.refine.done', { modelId, path: 'structured' })
            return structured
        }

        const tText = performance.now()
        const result = await generateText({
            model: opencodeGoMedVision(modelId),
            abortSignal: signal,
            maxOutputTokens: 4000,
            providerOptions: visionProviderOptions(modelId) as any,
            messages: [
                {
                    role: 'system' as const,
                    content: systemContent,
                },
                {
                    role: 'user' as const,
                    content: userContent,
                },
            ],
        })
        visionInfo('text_path.ok', { phase: 'refinement', modelId, textChars: result.text.length, ms: elapseMs(tText) })
        if (!result.text.trim()) {
            throw new Error('empty_response_from_model')
        }
        return VisionSchema.parse(extractJSON(result.text))
    }

    const payloadBytes = regionImageData.length
    return callWithFallback(models, generateWithModel, { estimatedPayloadBytes: payloadBytes })
}

export async function callVisionDetection(
    imageData: string,
    clinicalContext?: string,
    models: readonly string[] = VISION_MODELS,
    prompts?: SpecialtyPrompts,
    userContext?: string | null,
): Promise<z.infer<typeof QuickDetectionSchema>> {
    const inadequateCheck = checkImageAdequacy(imageData)
    if (!inadequateCheck.adequate) {
        throw new ImageInadequateError(inadequateCheck.reason, inadequateCheck.details)
    }

    const activeQuickPrompt = prompts?.quickDetectionPrompt ?? QUICK_DETECTION_PROMPT

    const quickUser =
        prompts?.quickDetectionUserInstruction ??
        'Execute a detecção rápida conforme o assistente. Responda somente com o JSON solicitado.'

    const generateWithModel = async (modelId: string, signal: AbortSignal) => {
        const img = imagePayloadStats(imageData)
        visionInfo('pipeline.quick.start', {
            modelId,
            ...img,
            ...contextLogFields(userContext, clinicalContext),
        })

        const userTextParts: { type: 'text'; text: string }[] = [
            {
                type: 'text' as const,
                text: quickUser,
            },
        ]
        appendUserContextParts(userTextParts, { userContext, clinicalContext, legacyFormat: 'short' })

        const systemContent = `${activeQuickPrompt}

FORMATO: Responda SOMENTE com JSON válido:
${QUICK_DETECTION_SCHEMA}`

        const userContent = buildUserContent(imageData, userTextParts)
        const structured = await tryGenerateObject(QuickDetectionSchema, modelId, signal, 2000, systemContent, userContent, 'quick_detection')
        if (structured) {
            visionInfo('pipeline.quick.structured', { modelId, path: 'structured' })
            return QuickDetectionSchema.parse(normalizeQuickDetectionPayload(structured))
        }

        const tText = performance.now()
        const result = await generateText({
            model: opencodeGoMedVision(modelId),
            abortSignal: signal,
            maxOutputTokens: 2000,
            providerOptions: visionProviderOptions(modelId) as any,
            messages: [
                {
                    role: 'system' as const,
                    content: systemContent,
                },
                {
                    role: 'user' as const,
                    content: userContent,
                },
            ],
        })
        visionInfo('text_path.ok', { phase: 'quick_detection', modelId, textChars: result.text.length, ms: elapseMs(tText) })
        if (!result.text.trim()) {
            throw new Error('empty_response_from_model')
        }

        // Parse com heurísticas mais flexíveis
        const parsed = parseWithHeuristics(result.text)
        if (parsed) {
            visionInfo('pipeline.quick.done', { modelId, path: 'text_fallback' })
            return QuickDetectionSchema.parse(normalizeQuickDetectionPayload(parsed))
        }

        // Último recurso
        try {
            const extracted = extractJSON(result.text)
            visionInfo('pipeline.quick.done', { modelId, path: 'extract_fallback' })
            return QuickDetectionSchema.parse(normalizeQuickDetectionPayload(extracted))
        } catch (e) {
            visionWarn('pipeline.quick.parse_failed', {
                modelId,
                message: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200),
                textPreview: result.text.slice(0, 300),
            })
            throw new Error('quick_parse_failed')
        }
    }

    const payloadBytes = imageData.length
    return callWithFallback(models, generateWithModel, { estimatedPayloadBytes: payloadBytes })
}

export async function callVisionDetailedAnalysis(
    imageData: string,
    quickDetections: z.infer<typeof QuickDetectionSchema>['quickDetections'],
    clinicalContext?: string,
    models: readonly string[] = VISION_MODELS,
    prompts?: SpecialtyPrompts,
    userContext?: string | null,
): Promise<z.infer<typeof DetailedDetectionSchema>> {
    const detectionsSummary = quickDetections
        .map((d, i) => `${i}: ${d.label} (${d.anatomicalRegion || 'N/A'}) - ${d.severity} - confiança ${Math.round(d.confidence * 100)}%`)
        .join('\n')

    const activeDetailedPrompt = prompts?.detailedAnalysisPrompt ?? DETAILED_ANALYSIS_PROMPT

    const generateWithModel = async (modelId: string, signal: AbortSignal) => {
        const img = imagePayloadStats(imageData)
        visionInfo('pipeline.detailed.start', {
            modelId,
            ...img,
            detectionCount: quickDetections.length,
            ...contextLogFields(userContext, clinicalContext),
        })

        const userTextParts: { type: 'text'; text: string }[] = [
            {
                type: 'text' as const,
                text: `Forneça análise detalhada para cada uma das ${quickDetections.length} detecções listadas acima. Para cada uma: CID-10, dados radiológicos quando aplicável, diagnóstico diferencial, significância clínica, ações recomendadas e descrição técnica.`,
            },
        ]
        appendUserContextParts(userTextParts, { userContext, clinicalContext, legacyFormat: 'short' })

        const systemContent = `${activeDetailedPrompt}

DETECÇÕES DO ESTÁGIO 1:
${detectionsSummary}

IMAGEM A ANALISAR:

FORMATO: Responda SOMENTE com JSON válido:
${DETAILED_ANALYSIS_SCHEMA}`

        const userContent = buildUserContent(imageData, userTextParts)
        const structured = await tryGenerateObject(
            DetailedDetectionSchema,
            modelId,
            signal,
            3500,
            systemContent,
            userContent,
            'detailed_analysis',
        )
        if (structured) {
            visionInfo('pipeline.detailed.structured', { modelId, path: 'structured', itemCount: structured.detailedAnalysis?.length })
            return structured
        }

        const tText = performance.now()
        const result = await generateText({
            model: opencodeGoMedVision(modelId),
            abortSignal: signal,
            maxOutputTokens: 3500,
            providerOptions: visionProviderOptions(modelId) as any,
            messages: [
                {
                    role: 'system' as const,
                    content: systemContent,
                },
                {
                    role: 'user' as const,
                    content: userContent,
                },
            ],
        })
        visionInfo('text_path.ok', { phase: 'detailed_analysis', modelId, textChars: result.text.length, ms: elapseMs(tText) })
        if (!result.text.trim()) {
            throw new Error('empty_response_from_model')
        }
        return DetailedDetectionSchema.parse(extractJSON(result.text))
    }

    const payloadBytes = imageData.length
    return callWithFallback(models, generateWithModel, { estimatedPayloadBytes: payloadBytes })
}

const normalizeLabel = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

const LAUDO_KEYWORDS: { pattern: RegExp; type: string; severity: 'critical' | 'moderate' | 'normal' }[] = [
    { pattern: /pneumonia|consolidação|consolidacao/gi, type: 'Pneumonia / Consolidação', severity: 'moderate' },
    { pattern: /derrame pleural|derrame/gi, type: 'Derrame Pleural', severity: 'moderate' },
    { pattern: /pneumotórax|pneumotorax/gi, type: 'Pneumotórax', severity: 'critical' },
    { pattern: /nódulo|nodulo|massa pulmonar/gi, type: 'Nódulo / Massa', severity: 'moderate' },
    { pattern: /fratura/gi, type: 'Fratura', severity: 'critical' },
    { pattern: /atelectasia/gi, type: 'Atelectasia', severity: 'moderate' },
    { pattern: /cardiomegalia/gi, type: 'Cardiomegalia', severity: 'moderate' },
    { pattern: /opacidade|infiltrado/gi, type: 'Opacidade / Infiltrado', severity: 'moderate' },
    { pattern: /calcificação|calcificacao/gi, type: 'Calcificação', severity: 'normal' },
    { pattern: /cisto|lesão cística/gi, type: 'Lesão Cística', severity: 'moderate' },
]

export async function callTwoStageVisionAnalysis(
    imageData: string,
    clinicalContext?: string,
    models: readonly string[] = VISION_MODELS,
    prompts?: SpecialtyPrompts,
    userContext?: string | null,
): Promise<{ analysis: VisionAnalysis; warnings: string[] }> {
    const warnings: string[] = []
    const twoStageT0 = performance.now()
    const img = imagePayloadStats(imageData)
    visionInfo('two_stage.start', {
        ...img,
        modelChain: models.join(' → '),
        ...contextLogFields(userContext, clinicalContext),
        structuredOutput: structuredVisionOutputEnabled(),
    })

    visionInfo('two_stage.stage1', { step: 'quick_detection' })
    const quickResult = await callVisionDetection(imageData, clinicalContext, models, prompts, userContext)
    visionInfo('two_stage.stage1.done', {
        detectionCount: quickResult.quickDetections.length,
        imageType: quickResult.meta.imageType,
        quality: quickResult.meta.quality,
        qualityScore: quickResult.meta.qualityScore,
        labels: quickResult.quickDetections.map((d) => d.label).join(', ').slice(0, 500),
    })

    if (quickResult.quickDetections.length === 0) {
        const qualityOk = quickResult.meta.qualityScore >= 45 && quickResult.meta.quality !== 'Inadequada'

        if (qualityOk) {
            try {
                visionInfo('two_stage.fallback_single_pass', { reason: 'stage1_empty_quality_ok' })
                const single = await callVisionAI(imageData, clinicalContext, models, prompts, userContext)
                warnings.push('Estágio 1 não retornou caixas delimitadoras; laudo em uma etapa foi usado para revisão.')
                visionInfo('two_stage.complete', { path: 'single_pass_fallback', totalMs: elapseMs(twoStageT0) })
                return { analysis: single, warnings }
            } catch (e) {
                visionWarn('two_stage.fallback_single_pass.failed', {
                    message: e instanceof Error ? e.message.slice(0, 400) : String(e).slice(0, 400),
                })
                Sentry.captureException(e instanceof Error ? e : new Error(String(e)), {
                    tags: { vision_stage: 'single_pass_fallback' },
                    extra: { reason: 'stage1_empty' },
                })
                warnings.push('Não foi possível revisar com laudo único; mantendo resumo sem achados delimitados.')
            }
        }

        visionInfo('two_stage.empty_detections', { path: 'basic_report', totalMs: elapseMs(twoStageT0) })
        return {
            analysis: {
                meta: quickResult.meta,
                detections: [],
                report: {
                    technicalAnalysis: 'Não foram identificadas anomalias radiográficas significativas na imagem analisada.',
                    detailedFindings: 'A imagem não apresenta alterações patológicas detectáveis.',
                    diagnosticHypothesis: 'Ausência de achados radiográficos significativos.',
                    recommendations: [
                        'Continuar com exames de rotina periódicos quando indicado clinicamente.',
                        'Correlacionar com quadro clínico.',
                    ],
                },
            },
            warnings,
        }
    }

    visionInfo('two_stage.stage2', { step: 'detailed_analysis', inputDetections: quickResult.quickDetections.length })
    let detailedAnalysis: z.infer<typeof DetailedDetectionSchema>['detailedAnalysis'] = []
    try {
        const detailedResult = await callVisionDetailedAnalysis(imageData, quickResult.quickDetections, clinicalContext, models, prompts, userContext)
        detailedAnalysis = detailedResult.detailedAnalysis
        visionInfo('two_stage.stage2.done', { detailedRows: detailedAnalysis.length })
    } catch (err) {
        visionWarn('two_stage.stage2.failed', {
            message: err instanceof Error ? err.message.slice(0, 400) : String(err).slice(0, 400),
        })
        warnings.push('Análise detalhada (estágio 2) indisponível; exibindo resumo do estágio 1.')
        Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
            tags: { vision_stage: '2' },
            extra: { models: models.join(',') },
        })
    }

    let detections = quickResult.quickDetections.map((qd, index) => {
        const byIndex = detailedAnalysis.find((d) => d.originalIndex === index)
        const byLabel =
            !byIndex ? detailedAnalysis.find((d) => normalizeLabel(d.label ?? '') === normalizeLabel(qd.label)) : undefined
        const detailed = byIndex ?? byLabel

        return {
            id: `det-${index}`,
            label: qd.label,
            confidence: qd.confidence,
            box: qd.box,
            severity: qd.severity,
            anatomicalRegion: qd.anatomicalRegion ?? detailed?.anatomicalRegion,
            cidCode: detailed?.cidCode,
            differentialDiagnosis: detailed?.differentialDiagnosis,
            clinicalSignificance: detailed?.clinicalSignificance,
            recommendedActions: detailed?.recommendedActions,
            description: detailed?.description,
            detailedDescription: detailed?.detailedDescription,
        }
    })

    visionInfo('two_stage.validate', { before: detections.length })
    detections = validateAndMergeDetections(detections) as typeof detections
    visionInfo('two_stage.validate.done', { after: detections.length })

    const perToothBreakdown = Object.entries(
        detections.reduce(
            (acc, det) => {
                const region = det.anatomicalRegion || 'Região não identificada'
                if (!acc[region]) acc[region] = []
                acc[region].push(det)
                return acc
            },
            {} as Record<string, typeof detections>,
        ),
    ).map(([region, dets]) => ({
        tooth: region,
        findings: dets.map((d) => d.label).join(', '),
        cidCode: dets.find((d) => d.cidCode)?.cidCode,
        severity: dets.some((d) => d.severity === 'critical')
            ? ('critical' as const)
            : dets.some((d) => d.severity === 'moderate')
              ? ('moderate' as const)
              : ('normal' as const),
    }))

    const recommendations = [...new Set(detections.flatMap((d) => d.recommendedActions || []))]
    const differentialDiagnosis = detections
        .flatMap((d) => d.differentialDiagnosis || [])
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 5)

    const report = {
        technicalAnalysis: `Análise técnica da imagem radiográfica ${quickResult.meta.imageType.toLowerCase()} de qualidade ${quickResult.meta.quality.toLowerCase()}.`,
        detailedFindings: detections
            .map((d) => `- ${d.label}${d.anatomicalRegion ? ` (${d.anatomicalRegion})` : ''}: ${d.detailedDescription || d.description || ''}`)
            .join('\n'),
        diagnosticHypothesis: `Baseado nas ${detections.length} anomalias detectadas, sugere-se investigação clínica das condições identificadas.`,
        recommendations: recommendations.length > 0 ? recommendations : ['Avaliação clínica recomendada.'],
        perToothBreakdown,
        differentialDiagnosis: differentialDiagnosis.length > 0 ? differentialDiagnosis.join('; ') : undefined,
    }

    const cleanDetections = detections.map((d) => {
        const { id: _id, _warnings: _w, ...rest } = d as typeof d & { _warnings?: string[] }
        return rest
    })

    visionInfo('two_stage.complete', {
        path: 'full_two_stage',
        totalMs: elapseMs(twoStageT0),
        finalDetections: cleanDetections.length,
        warningsCount: warnings.length,
    })

    return {
        analysis: {
            meta: quickResult.meta,
            detections: cleanDetections,
            report,
        } satisfies VisionAnalysis,
        warnings,
    }
}

export function mapAnalysisToResponse(
    analysis: VisionAnalysis,
    options?: { pipelineWarnings?: string[] },
) {
    const qualityScore = analysis.meta.qualityScore
    const avgDetectionConfidence =
        analysis.detections.length > 0
            ? analysis.detections.reduce((sum, d) => sum + (d.confidence ?? 0.8), 0) / analysis.detections.length
            : 0.8
    const overallPrecision = Math.round(qualityScore * 0.4 + avgDetectionConfidence * 100 * 0.6)

    const detections = analysis.detections.map((d, i) => ({
        id: `det-${i}`,
        label: d.label,
        confidence: d.confidence ?? 0.85,
        box: {
            ymin: d.box[0],
            xmin: d.box[1],
            ymax: d.box[2],
            xmax: d.box[3],
        },
        severity: d.severity,
        description: d.description,
        detailedDescription: d.detailedDescription,
        anatomicalRegion: d.anatomicalRegion,
        cidCode: d.cidCode,
        differentialDiagnosis: d.differentialDiagnosis,
        clinicalSignificance: d.clinicalSignificance,
        recommendedActions: d.recommendedActions,
    }))

    let findings = analysis.detections.map((d) => ({
        type: d.label,
        zone: d.description ? d.description.slice(0, 50) : d.anatomicalRegion ? d.anatomicalRegion : 'Região Identificada',
        level: d.severity === 'critical' ? 'Crítico' : d.severity === 'moderate' ? 'Moderado' : 'Normal',
        color: d.severity === 'critical' ? 'text-red-500' : d.severity === 'moderate' ? 'text-amber-500' : 'text-blue-500',
        confidence: d.confidence ?? 0.85,
    }))

    const extractFromLaudo = process.env.MEDVISION_EXTRACT_FINDINGS_FROM_REPORT === 'true'

    if (findings.length === 0 && analysis.report.detailedFindings && extractFromLaudo) {
        const findingsText = analysis.report.detailedFindings
        const extractedFindings: typeof findings = []
        for (const kw of LAUDO_KEYWORDS) {
            if (kw.pattern.test(findingsText)) {
                extractedFindings.push({
                    type: kw.type,
                    zone: 'Identificado no laudo',
                    level: kw.severity === 'critical' ? 'Crítico' : kw.severity === 'moderate' ? 'Moderado' : 'Normal',
                    color: kw.severity === 'critical' ? 'text-red-500' : kw.severity === 'moderate' ? 'text-amber-500' : 'text-blue-500',
                    confidence: avgDetectionConfidence,
                })
            }
        }
        if (extractedFindings.length > 0) findings = extractedFindings
    }

    const pipelineWarnings = options?.pipelineWarnings?.filter((w) => w.length > 0) ?? []

    return {
        meta: analysis.meta,
        detections,
        report: analysis.report,
        findings,
        precision: overallPrecision,
        ...(pipelineWarnings.length > 0 ? { warnings: pipelineWarnings } : {}),
    }
}
