/**
 * E2E — Med Vision / Odonto Vision (/dashboard/odonto-vision)
 * Fluxo UI: PERSONALIZAR (upload + formulário) → REVISÃO (opcional crop) → ANALISAR → resultado.
 *
 * Caminho revisão → análise: "Revisar análise" → "Usar imagem inteira" ou confirmar recorte → "Analisar agora".
 *
 * Sessão: projeto `chromium-odonto` + auth.setup.ts (storageState).
 * Análise real (API): defina E2E_VISION_ANALYZE=1 e credenciais válidas.
 */
import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'

const FIXTURE_JPG = path.join(
  process.cwd(),
  'tests-e2e/fixtures/vision-sample.jpg'
)

/** Padrão Med Vision; deve coincidir com MODELS.vision (OpenCode Go gpt-5.6-luna max). */
const DEFAULT_VISION_MODEL = 'gpt-5.6-luna'

const IMAGENS_DE_TESTE_TORAX = [
  'torax.png',
  'torax-1.png',
  'torax-3.png',
] as const

const runVisionApi = () =>
  process.env.E2E_VISION_ANALYZE === '1' ||
  process.env.E2E_VISION_ANALYZE === 'true'

async function gotoPath(
  page: Page,
  pathStr: string,
  opts?: { timeout?: number }
) {
  await page.goto(pathStr, {
    waitUntil: 'domcontentloaded',
    timeout: opts?.timeout ?? 60_000,
  })
}

/** Após "Analisar agora", aguarda resultado ou erro explícito da UI (evita timeout opaco). */
async function waitForVisionAnalysisOutcome(page: Page) {
  await page.getByRole('button', { name: /Analisar agora/i }).click()
  const errorBanner = page.getByText(/Não foi possível completar a análise/i)
  const exportPdf = page.getByRole('tab', { name: /Laudo/i }).first()
  const outcome = await Promise.race([
    errorBanner.waitFor({ state: 'visible', timeout: 150_000 }).then(() => 'error' as const),
    exportPdf.waitFor({ state: 'visible', timeout: 150_000 }).then(() => 'ok' as const),
  ]).catch(() => 'timeout' as const)

  if (outcome === 'error') {
    throw new Error(
      'A API /api/vision/analyze falhou no servidor (mensagem "Não foi possível completar a análise"). Verifique na Vercel: OPENROUTER_API_KEY, modelo de visão, limites e créditos.'
    )
  }
  if (outcome === 'timeout') {
    throw new Error(
      'Timeout aguardando resultado da análise (>150s). Verifique cold start, rede ou fila da API.'
    )
  }
}

/**
 * Clica em "Analisar agora" na etapa de revisão e assegura que POST /api/vision/analyze
 * retorna `modelId` com o modelo padrão (mesmo sem seletor de modelo na UI).
 */
async function assertVisionResponseUsesDefaultModel(page: Page) {
  const postPromise = page.waitForResponse(
    (r) =>
      r.url().includes('/api/vision/analyze') && r.request().method() === 'POST',
    { timeout: 150_000 }
  )
  await page.getByRole('button', { name: /Analisar agora/i }).click()
  const res = await postPromise
  expect(
    res.status(),
    'POST /api/vision/analyze deve concluir com sucesso'
  ).toBe(200)
  const data = (await res.json()) as { modelId?: string; error?: string }
  expect(
    data.modelId,
    'Resposta de /api/vision/analyze deve expor modelId = GLM-5V Turbo por defeito'
  ).toBe(DEFAULT_VISION_MODEL)

  const errorBanner = page.getByText(/Não foi possível completar a análise/i)
  const exportPdf = page.getByRole('tab', { name: /Laudo/i }).first()
  const uiOutcome = await Promise.race([
    errorBanner.waitFor({ state: 'visible', timeout: 150_000 }).then(() => 'error' as const),
    exportPdf.waitFor({ state: 'visible', timeout: 150_000 }).then(() => 'ok' as const),
  ]).catch(() => 'timeout' as const)

  if (uiOutcome === 'error') {
    throw new Error(
      'A API respondeu 200 e modelId GLM, mas a UI mostrou "Não foi possível completar a análise".'
    )
  }
  if (uiOutcome === 'timeout') {
    throw new Error(
      'Timeout aguardando UI após resposta 200 de /api/vision/analyze (>150s).'
    )
  }
}

test.describe('Odonto Vision (Med Vision)', () => {
  test.describe.configure({ mode: 'serial', timeout: 400_000 })

  test('TC002 — abrir Odonto Vision a partir do dashboard', async ({
    page,
  }) => {
    await gotoPath(page, '/dashboard')
    await page.getByRole('link', { name: /Med Vision/i }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/odonto-vision/)
    await expect(
      page.getByRole('heading', { name: /Med Vision/i })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Selecionar arquivo/i })
    ).toBeVisible()
  })

  test('TC005 — sem imagem não há botão Analisar agora', async ({ page }) => {
    await gotoPath(page, '/dashboard/odonto-vision')
    // Na etapa de personalização pré-upload o CTA principal é apenas upload/Revisar.
    await expect(
      page.getByRole('button', { name: /Analisar agora/i })
    ).toHaveCount(0)
  })

  test('TC006 — sem resultado não há exportação de PDF', async ({ page }) => {
    await gotoPath(page, '/dashboard/odonto-vision')
    await expect(
      page.getByRole('button', { name: /PDF do Laudo|PDF da Conduta|Exportar PDF/i })
    ).toHaveCount(0)
  })

  test('TC004 — contexto permanece na etapa de revisão', async ({ page }) => {
    await gotoPath(page, '/dashboard/odonto-vision')

    await page.locator('input[type="file"]').setInputFiles(FIXTURE_JPG)
    await expect(
      page.getByPlaceholder(/tosse persistente|queixa principal/i)
    ).toBeVisible({ timeout: 20_000 })

    const marker = `E2E contexto ${Date.now()}`
    await page.getByPlaceholder(/tosse persistente|queixa principal/i).fill(marker)

    await page.getByRole('button', { name: /Revisar análise/i }).click()
    await expect(page.getByText(/Ajustar região|Resumo da análise/i).first()).toBeVisible({
      timeout: 10_000,
    })

    await expect(page.getByText(marker)).toBeVisible()
    await expect(page.getByText(/MedVision IA 0\.1/i)).toBeVisible()
    // Fluxo atual não expõe seletor de modelo na UI (apenas MedVision IA 0.1).
    await expect(
      page.getByRole('combobox', { name: /modelo\b/i })
    ).toHaveCount(0)
  })

  test('TC001 — fluxo completo até resultado (API real)', async ({
    page,
  }, testInfo) => {
    test.skip(
      !runVisionApi(),
      'Defina E2E_VISION_ANALYZE=1 para executar análise real'
    )
    testInfo.setTimeout(240_000)

    await gotoPath(page, '/dashboard/odonto-vision')

    await page.locator('input[type="file"]').setInputFiles(FIXTURE_JPG)
    await expect(
      page.getByPlaceholder(/tosse persistente|queixa principal/i)
    ).toBeVisible({ timeout: 20_000 })

    await page
      .getByPlaceholder(/tosse persistente|queixa principal/i)
      .fill('Teste E2E: radiografia para análise automatizada.')

    await page.getByRole('button', { name: /Revisar análise/i }).click()
    await page.getByRole('button', { name: /Usar imagem inteira/i }).click()
    await waitForVisionAnalysisOutcome(page)

    await expect(
      page.getByRole('button', { name: /Analisar Outra/i }).first()
    ).toBeVisible()

    await expect(
      page.getByText(/Laudo|Hipótese|achados|Sem achados significativos/i).first()
    ).toBeVisible({ timeout: 15_000 })
  })

  for (const fileName of IMAGENS_DE_TESTE_TORAX) {
    test(`TC007 — fluxo com Imagens de teste / ${fileName} (API + modelId padrão)`, async ({
      page,
    }, testInfo) => {
      test.skip(
        !runVisionApi(),
        'Defina E2E_VISION_ANALYZE=1 para executar análise real'
      )
      testInfo.setTimeout(240_000)

      const imagePath = path.join(process.cwd(), 'Imagens de teste', fileName)
      await gotoPath(page, '/dashboard/odonto-vision')

      await page.locator('input[type="file"]').setInputFiles(imagePath)
      await expect(
        page.getByPlaceholder(/tosse persistente|queixa principal/i)
      ).toBeVisible({ timeout: 20_000 })

      await page
        .getByPlaceholder(/tosse persistente|queixa principal/i)
        .fill(
          `Teste E2E (pasta Imagens de teste): ${fileName} — análise MedVision IA 0.1.`
        )

      await page.getByRole('button', { name: /Revisar análise/i }).click()
      await page.getByRole('button', { name: /Usar imagem inteira/i }).click()

      await assertVisionResponseUsesDefaultModel(page)

      await expect(
        page.getByRole('button', { name: /Analisar Outra/i }).first()
      ).toBeVisible()

      await expect(
        page.getByText(/Laudo|Hipótese|achados|Sem achados significativos/i).first()
      ).toBeVisible({ timeout: 15_000 })
    })
  }

  test('TC003 — refinar região após resultado (API real)', async ({
    page,
  }, testInfo) => {
    test.skip(
      !runVisionApi(),
      'Defina E2E_VISION_ANALYZE=1 para executar análise real'
    )
    testInfo.setTimeout(300_000)

    await gotoPath(page, '/dashboard/odonto-vision')

    await page.locator('input[type="file"]').setInputFiles(FIXTURE_JPG)
    await expect(
      page.getByPlaceholder(/tosse persistente|queixa principal/i)
    ).toBeVisible({ timeout: 20_000 })

    await page
      .getByPlaceholder(/tosse persistente|queixa principal/i)
      .fill('Teste E2E TC003 — contexto clínico para refinamento de região.')

    await page.getByRole('button', { name: /Revisar análise/i }).click()
    await page.getByRole('button', { name: /Usar imagem inteira/i }).click()

    await waitForVisionAnalysisOutcome(page)

    await expect(
      page.getByRole('button', { name: /^Refinar Região$/i })
    ).toBeVisible({ timeout: 30_000 })

    await page.getByRole('button', { name: /^Refinar Região$/i }).click()

    const regionUi = page.getByRole('dialog', {
      name: /Selecione uma região da imagem/i,
    })
    await expect(regionUi).toBeVisible()
    const box = await regionUi.boundingBox()
    if (!box) throw new Error('Region selector sem bounding box')
    const x0 = box.x + box.width * 0.25
    const y0 = box.y + box.height * 0.25
    const x1 = box.x + box.width * 0.75
    const y1 = box.y + box.height * 0.75
    await page.mouse.move(x0, y0)
    await page.mouse.down()
    await page.mouse.move(x1, y1)
    await page.mouse.up()

    await page.getByRole('button', { name: /Re-analisar Região/i }).click()

    await expect(
      page.getByText(/Região re-analisada com sucesso|re-analisad/i).first()
    ).toBeVisible({ timeout: 90_000 })
  })
})
