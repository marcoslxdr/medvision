import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { hasMedVisionAuth, buildVisionModelChain, visionModel, hasMedVisionAuth as auth } from '../lib/ai/vision-model'
import { hasChatgptCodexAuthSync } from '../lib/ai/chatgpt-codex'
import { callVisionDetection, callVisionAI } from '../lib/vision/pipeline'

function toDataUrl(path: string) {
  const buf = readFileSync(path)
  const mime = path.endsWith('.png') ? 'image/png' : 'image/jpeg'
  return `data:${mime};base64,${buf.toString('base64')}`
}

async function runOne(path: string, mode: 'quick' | 'full') {
  const imageData = toDataUrl(path)
  const models = [...buildVisionModelChain()]
  const t0 = performance.now()
  try {
    if (mode === 'quick') {
      const r = await callVisionDetection(imageData, 'Teste E2E Ranira — tórax.', models)
      const ms = Math.round(performance.now() - t0)
      return {
        ok: true,
        mode,
        path,
        ms,
        models,
        detections: r.quickDetections?.length ?? 0,
        quality: r.meta?.quality,
        sample: (r.quickDetections || []).slice(0, 3).map((d: any) => d.label || d.findings || d.type || JSON.stringify(d).slice(0,80)),
        reportPreview: undefined as string | undefined,
      }
    }
    const r = await callVisionAI(imageData, 'Paciente adulto, dor torácica. Teste E2E.', models)
    const ms = Math.round(performance.now() - t0)
    const report = (r as any).report || (r as any).laudo || (r as any).summary || ''
    return {
      ok: true,
      mode,
      path,
      ms,
      models,
      detections: (r as any).quickDetections?.length ?? (r as any).findings?.length ?? null,
      quality: (r as any).meta?.quality,
      sample: undefined,
      reportPreview: String(report).slice(0, 280),
      keys: Object.keys(r as any).slice(0, 12),
    }
  } catch (e: any) {
    return {
      ok: false,
      mode,
      path,
      ms: Math.round(performance.now() - t0),
      error: e?.message || String(e),
      name: e?.name,
    }
  }
}

async function main() {
  console.log(JSON.stringify({
    auth: hasMedVisionAuth(),
    chatgpt: hasChatgptCodexAuthSync(),
    chain: buildVisionModelChain(),
  }))
  const images = [
    'Imagens de teste/torax.png',
    'Imagens de teste/torax-1.png',
    'Imagens de teste/torax-3.png',
  ]
  const results = [] as any[]
  // quick on all
  for (const img of images) {
    results.push(await runOne(img, 'quick'))
  }
  // full on first
  results.push(await runOne(images[0], 'full'))
  console.log(JSON.stringify(results, null, 2))
  const fails = results.filter(r => !r.ok)
  if (fails.length) process.exitCode = 1
}

main()
