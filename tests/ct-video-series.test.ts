import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildCtVideoUserInstruction,
  frameLabel,
  CT_VIDEO_SYSTEM_ADDENDUM,
} from '../lib/vision/ct-video-prompts'
import { visionAnalysisRequestSchema } from '../lib/types/vision-analysis-request'

describe('ct-video-prompts', () => {
  it('buildCtVideoUserInstruction menciona série e JSON', () => {
    const text = buildCtVideoUserInstruction({ frameCount: 8, durationSec: 12.5, full: true })
    assert.match(text, /8/)
    assert.match(text, /12\.5/)
    assert.match(text, /JSON/i)
    assert.match(text, /SÉRIE|série/i)
  })

  it('frameLabel formata índice e tempo', () => {
    assert.equal(frameLabel(0, 8, 1.25), '[Corte 1/8 · t=1.25s]')
  })

  it('addendum fala em multi-corte', () => {
    assert.match(CT_VIDEO_SYSTEM_ADDENDUM, /multi-corte|série/i)
  })
})

describe('visionAnalysisRequestSchema multi-frame', () => {
  it('aceita images[] sem image', () => {
    const parsed = visionAnalysisRequestSchema.safeParse({
      images: ['data:image/jpeg;base64,' + 'a'.repeat(40), 'data:image/jpeg;base64,' + 'b'.repeat(40)],
      sourceType: 'video',
      modality: 'tc',
      videoMeta: { durationSec: 5, frameCount: 2, timestampsSec: [0.5, 2.5] },
    })
    assert.equal(parsed.success, true)
  })

  it('rejeita body sem image e sem images', () => {
    const parsed = visionAnalysisRequestSchema.safeParse({ modality: 'tc' })
    assert.equal(parsed.success, false)
  })
})
