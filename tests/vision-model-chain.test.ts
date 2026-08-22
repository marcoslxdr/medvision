import assert from "node:assert/strict"
import { describe, it } from "node:test"

process.env.MEDVISION_VISION_LOG = "0"
import {
  buildVisionModelChain,
  DEFAULT_VISION_MODEL_CHAIN,
  MODELS,
} from "../lib/ai/vision-model"
import { callWithFallback } from "../lib/vision/model-fallback"

const LUNA = MODELS.vision
const KIMI = MODELS.visionAlt

describe("buildVisionModelChain (Med Vision / OpenCode Go)", () => {
  it("com Luna (padrão) selecionado, retorna cadeia padrão Luna → Kimi", () => {
    const chain = buildVisionModelChain(LUNA)
    assert.deepEqual(chain, [LUNA, KIMI])
  })

  it("com Kimi selecionado, primário primeiro e Luna como fallback", () => {
    const chain = buildVisionModelChain(KIMI)
    assert.deepEqual(chain, [KIMI, LUNA])
  })

  it("com modelo customizado fora da lista, primário + cadeia padrão completa", () => {
    const custom = "deepseek-v4-flash"
    const chain = buildVisionModelChain(custom)
    assert.deepEqual(chain, [custom, ...DEFAULT_VISION_MODEL_CHAIN])
  })

  it("sem seleção (undefined, string vazia): cadeia padrão; id desconhecido vira custom + fallback", () => {
    assert.deepEqual(buildVisionModelChain(), [...DEFAULT_VISION_MODEL_CHAIN])
    assert.deepEqual(buildVisionModelChain(undefined), [...DEFAULT_VISION_MODEL_CHAIN])
    assert.deepEqual(buildVisionModelChain(""), [...DEFAULT_VISION_MODEL_CHAIN])
    assert.deepEqual(buildVisionModelChain("not-a-vision-model"), [
      "not-a-vision-model",
      ...DEFAULT_VISION_MODEL_CHAIN,
    ])
  })

  it("DEFAULT_VISION_MODEL_CHAIN é Luna → Kimi k2.6", () => {
    assert.deepEqual(DEFAULT_VISION_MODEL_CHAIN, [MODELS.vision, MODELS.visionAlt])
    assert.deepEqual(DEFAULT_VISION_MODEL_CHAIN, ["gpt-5.6-luna", "kimi-k2.6"])
  })
})

describe("callWithFallback", () => {
  it("erro retryable no 1.º modelo tenta o 2.º", async () => {
    const e = new Error("timeout after 30s")
    let calls: string[] = []
    const result = await callWithFallback([LUNA, KIMI] as const, async (modelId) => {
      calls.push(modelId)
      if (modelId === LUNA) throw e
      return { ok: true, model: modelId }
    }, { maxRetriesPerModel: 1 })
    assert.deepEqual(calls, [LUNA, KIMI])
    assert.deepEqual(result, { ok: true, model: KIMI })
  })

  it("escolhe o 1.º quando responde", async () => {
    const r = await callWithFallback([LUNA, KIMI] as const, async (modelId) => {
      if (modelId === LUNA) return "first"
      return "second"
    })
    assert.equal(r, "first")
  })
})
