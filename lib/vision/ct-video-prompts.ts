/**
 * Prompts e helpers para análise de série/tomografia em vídeo (cine/scroll TC).
 */

export const CT_VIDEO_SYSTEM_ADDENDUM = `
## Série de Tomografia em vídeo / multi-corte
Você está analisando uma **série de cortes** (frames de vídeo de tomografia computadorizada ou scroll cine).
- Trate cada frame como um corte/posição diferente da série (axial, coronal ou sagital conforme aparente).
- Integre achados **ao longo da série** (evolução cranio-caudal / anteroposterior), não descreva só um frame isolado.
- Indique nível aproximado quando possível (ex.: ápice, hilos, bases; C-spine levels; etc.).
- Diferencie achados consistentes em múltiplos cortes de artefatos de um único frame.
- No laudo, mencione que a entrada foi uma série multi-corte amostrada de vídeo (não volume DICOM nativo completo).
- Bounding boxes: se um achado aparece em vários cortes, descreva no texto; bbox pode referir o frame mais representativo.
`.trim()

export function buildCtVideoUserInstruction(params: {
  frameCount: number
  durationSec?: number
  full?: boolean
}): string {
  const n = params.frameCount
  const dur =
    params.durationSec != null && params.durationSec > 0
      ? ` Duração do vídeo: ~${params.durationSec.toFixed(1)}s.`
      : ''
  if (params.full) {
    return `Analise a SÉRIE DE TOMOGRAFIA abaixo (${n} cortes amostrados de vídeo).${dur}
Gere um laudo radiológico completo no JSON exigido, integrando achados multi-corte.
Para cada achado relevante, cite em quais frames (índice 1–${n} e tempo se indicado) ele aparece.
Responda SOMENTE com o JSON.`
  }
  return `Analise a SÉRIE DE TOMOGRAFIA (${n} cortes de vídeo).${dur}
Faça detecção rápida dos principais achados ao longo da série. Responda SOMENTE com o JSON.`
}

export function frameLabel(index: number, total: number, timeSec?: number): string {
  const t =
    timeSec != null && Number.isFinite(timeSec) ? ` · t=${timeSec.toFixed(2)}s` : ''
  return `[Corte ${index + 1}/${total}${t}]`
}
