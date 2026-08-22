import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { MODELS, visionProviderOptions, hasMedVisionAuth, buildVisionModelChain } from "../lib/ai/vision-model"

const LUNA = "gpt-5.6-luna"

describe("Modelo padrão de análise de visão (Med Vision)", () => {
  it("MODELS.vision aponta para GPT-5.6 Luna", () => {
    assert.equal(MODELS.vision, LUNA)
  })

  it("buildVisionModelChain padrão é Luna → Kimi", () => {
    assert.deepEqual(buildVisionModelChain(), [LUNA, MODELS.visionAlt])
  })

  it("visionProviderOptions devolve options (chatgpt ou opencode)", () => {
    const opts = visionProviderOptions(LUNA)
    assert.ok(opts && typeof opts === "object")
    const keys = Object.keys(opts)
    assert.ok(keys.includes("chatgpt-codex") || keys.includes("opencode-go-medvision"))
  })

  it("hasMedVisionAuth é boolean", () => {
    assert.equal(typeof hasMedVisionAuth(), "boolean")
  })
})
