import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { MODELS, visionProviderOptions } from "../lib/ai/opencode-go"

const LUNA = "gpt-5.6-luna"

describe("Modelo padrão de análise de visão (Med Vision / OpenCode Go)", () => {
  it("MODELS.vision aponta para GPT-5.6 Luna (ChatGPT Luna max)", () => {
    assert.equal(MODELS.vision, LUNA)
  })

  it("visionProviderOptions aplica reasoningEffort max no Luna", () => {
    const opts = visionProviderOptions(LUNA) as {
      "opencode-go-medvision": { reasoningEffort: string }
    }
    assert.equal(opts["opencode-go-medvision"].reasoningEffort, "max")
  })

  it("visionProviderOptions não força effort em Kimi", () => {
    assert.equal(visionProviderOptions(MODELS.visionAlt), undefined)
  })
})
