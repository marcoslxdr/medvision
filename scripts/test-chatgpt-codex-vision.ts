import { readFileSync } from 'node:fs'
import { generateText } from 'ai'
import { visionModel, visionProviderOptions, hasMedVisionAuth } from '../lib/ai/vision-model'
import { hasChatgptCodexAuthSync } from '../lib/ai/chatgpt-codex'

async function main() {
  const imgPath = process.env.IMG || 'Imagens de teste/torax-1.png'
  const b64 = readFileSync(imgPath).toString('base64')
  const dataUrl = imgPath.endsWith('.png')
    ? `data:image/png;base64,${b64}`
    : `data:image/jpeg;base64,${b64}`
  console.log('auth', hasMedVisionAuth(), 'chatgpt', hasChatgptCodexAuthSync())
  const modelId = 'gpt-5.6-luna'
  const t0 = Date.now()
  const result = await generateText({
    model: visionModel(modelId),
    providerOptions: visionProviderOptions(modelId) as any,
    messages: [
      {
        role: 'system',
        content:
          'Você analisa imagens médicas. Responda em 1 frase curta o tipo de exame se visível.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'O que você vê nesta imagem? Resposta curta.' },
          { type: 'image', image: dataUrl },
        ],
      },
    ],
  })
  console.log('ms', Date.now() - t0)
  console.log('text', (result.text || '').slice(0, 500))
  console.log('finish', (result as any).finishReason)
}

main().catch((e) => {
  console.error('FAIL', e instanceof Error ? e.message : e)
  if (e && typeof e === 'object' && 'cause' in e) console.error('cause', (e as any).cause)
  process.exitCode = 1
})
