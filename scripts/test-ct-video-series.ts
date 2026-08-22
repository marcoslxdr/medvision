import { readFileSync } from 'node:fs'
import { callVisionSeriesAI } from '../lib/vision/pipeline'
import { buildVisionModelChain, hasMedVisionAuth } from '../lib/ai/vision-model'
import { hasChatgptCodexAuthSync } from '../lib/ai/chatgpt-codex'
import { CT_VIDEO_SYSTEM_ADDENDUM, buildCtVideoUserInstruction } from '../lib/vision/ct-video-prompts'

function toDataUrl(path: string) {
  const buf = readFileSync(path)
  return `data:image/png;base64,${buf.toString('base64')}`
}

async function main() {
  console.log(
    JSON.stringify({
      auth: hasMedVisionAuth(),
      chatgpt: hasChatgptCodexAuthSync(),
      chain: buildVisionModelChain(),
    }),
  )

  const frames = [
    toDataUrl('Imagens de teste/torax.png'),
    toDataUrl('Imagens de teste/torax-1.png'),
    toDataUrl('Imagens de teste/torax-3.png'),
  ]
  const t0 = performance.now()
  const analysis = await callVisionSeriesAI(frames, {
    clinicalContext: 'Série TC tórax simulada (3 cortes de vídeo). Teste E2E Ranira.',
    models: [...buildVisionModelChain()],
    systemAddendum: CT_VIDEO_SYSTEM_ADDENDUM,
    fullInstruction: buildCtVideoUserInstruction({
      frameCount: frames.length,
      durationSec: 4.5,
      full: true,
    }),
    timestampsSec: [0.5, 2.0, 3.8],
  })
  const ms = Math.round(performance.now() - t0)
  console.log(
    JSON.stringify(
      {
        ok: true,
        ms,
        meta: analysis.meta,
        reportKeys: analysis.report ? Object.keys(analysis.report) : [],
        hypothesis: String((analysis.report as any)?.diagnosticHypothesis || '').slice(0, 280),
        technical: String((analysis.report as any)?.technicalAnalysis || '').slice(0, 220),
        detections: (analysis as any).detections?.length ?? null,
      },
      null,
      2,
    ),
  )
}

main().catch((e) => {
  console.error('FAIL', e instanceof Error ? e.message : e)
  process.exitCode = 1
})
