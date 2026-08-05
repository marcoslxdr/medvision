import assert from "node:assert/strict"
import { describe, it } from "node:test"

process.env.MEDVISION_VISION_LOG = "0"
import {
  buildVisionModelChain,
  DEFAULT_VISION_MODEL_CHAIN,
  MODELS,
} from "../lib/ai/opencode-go"
import { callWithFallback } from "../lib/vision/model-fallback"

const KIMI = MODELS.vision
const GLM = MODELS.visionAlt

describe("buildVisionModelChain (Med Vision / OpenCode Go)", () => {
  it("com Kimi (padrão) selecionado, retorna cadeia padrão Kimi → Kimi k2.7", () => {
    const chain = buildVisionModelChain(KIMI)
    assert.deepEqual(chain, [KIMI, GLM])
  })

  it("com Kimi k2.7 selecionado, primário primeiro e Kimi k2.6 como fallback", () => {
    const chain = buildVisionModelChain(GLM)
    assert.deepEqual(chain, [GLM, KIMI])
  })

  it("com modelo customizado fora da lista Kimi/GLM, primário + cadeia padrão completa", () => {
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

  it("DEFAULT_VISION_MODEL_CHAIN é Kimi → Kimi k2.7", () => {
    assert.deepEqual(DEFAULT_VISION_MODEL_CHAIN, [MODELS.vision, MODELS.visionAlt])
  })
})

describe("callWithFallback", () => {
  it("erro retryable no 1.º modelo tenta o 2.º", async () => {
    const e = new Error("timeout after 30s")
    let calls: string[] = []
    const result = await callWithFallback([KIMI, GLM] as const, async (modelId) => {
      calls.push(modelId)
      if (modelId === KIMI) throw e
      return { ok: true, model: modelId }
    }, { maxRetriesPerModel: 1 })
    assert.deepEqual(calls, [KIMI, GLM])
    assert.deepEqual(result, { ok: true, model: GLM })
  })

  it("escolhe o 1.º quando responde", async () => {
    const r = await callWithFallback([KIMI, GLM] as const, async (modelId) => {
      if (modelId === KIMI) return "first"
      return "second"
    })
    assert.equal(r, "first")
  })
})
