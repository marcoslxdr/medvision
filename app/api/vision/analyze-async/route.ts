import { start } from 'workflow/api'
import { NextResponse } from 'next/server'

import { buildVisionModelChain, hasMedVisionAuth as hasMedVisionOpenCodeGoKey } from '@/lib/ai/vision-model'
import { hasEnoughCredits } from '@/lib/credits/service'
import { visionAnalysisRequestSchema } from '@/lib/types/vision-analysis-request'
import { buildVisionUserContext } from '@/lib/vision/build-analysis-context'
import { validateImagePayload } from '@/lib/vision/json-utils'
import { normalizeVisionImageDataUrl, compressToMax } from '@/lib/vision/normalize-image'
import { checkUsageLimit } from '@/lib/vision/rate-limit'
import { createClient } from '@/lib/supabase/server'
import {
  visionAnalyzeWorkflow,
  type VisionWorkflowInput,
} from '@/workflows/vision-analyze'

export const maxDuration = 60

/**
 * Starts a durable vision analysis workflow and returns runId for polling/resume.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = visionAnalysisRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data

  // Série de vídeo TC: workflow async ainda não multi-frame — cliente cai no path sync.
  if ((data.images && data.images.length > 1) || data.sourceType === 'video') {
    return NextResponse.json(
      { error: 'Video/series analysis uses sync path', code: 'SERIES_SYNC_REQUIRED' },
      { status: 501 },
    )
  }

  let imageData = data.image ?? data.images?.[0]
  if (!imageData) {
    return NextResponse.json({ error: 'image required' }, { status: 400 })
  }
  const before = imageData
  try {
    imageData = await normalizeVisionImageDataUrl(imageData)
    imageData = await compressToMax(imageData)
  } catch {
    // keep original
  }
  const wasCompressed = imageData !== before

  const payloadCheck = validateImagePayload(imageData)
  if (!payloadCheck.valid) {
    return NextResponse.json({ error: payloadCheck.message }, { status: 413 })
  }

  if (!hasMedVisionOpenCodeGoKey()) {
    return NextResponse.json(
      {
        error: {
          code: 'VISION_API_NOT_CONFIGURED',
          message: 'Serviço de análise de imagem não disponível.',
        },
      },
      { status: 500 },
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_type')
    .eq('id', user.id)
    .maybeSingle()
  const userPlan = (profile?.plan_type as string | null) ?? 'free'

  const usageCheck = await checkUsageLimit(
    user.id,
    async (uid, since) => {
      const { count, error } = await supabase
        .from('vision_usage_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .gte('created_at', since)
      if (error) throw error
      return count ?? 0
    },
    userPlan,
  )

  if (!usageCheck.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMIT', message: usageCheck.reason } },
      { status: 429 },
    )
  }

  const models = [...buildVisionModelChain()]
  const creditCheck = await hasEnoughCredits(user.id, models[0])
  if (!creditCheck.ok) {
    return NextResponse.json(
      {
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: 'Créditos insuficientes para esta análise.',
        },
      },
      { status: 402 },
    )
  }

  const userContext = buildVisionUserContext(data)
  const requestId = crypto.randomUUID().slice(0, 8)

  const input: VisionWorkflowInput = {
    userId: user.id,
    imageData,
    clinicalContext: data.clinicalContext ?? undefined,
    userContext: userContext ?? undefined,
    mode: data.mode,
    specialty: data.specialty ?? undefined,
    models,
    originalAnalysisSummary: data.originalAnalysisSummary ?? undefined,
    requestId,
  }

  const run = await start(visionAnalyzeWorkflow, [input])

  return NextResponse.json({
    runId: run.runId,
    requestId,
    wasCompressed,
    message: 'Análise iniciada. Use runId para acompanhar o progresso.',
  })
}
