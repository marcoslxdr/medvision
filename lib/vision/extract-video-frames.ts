/**
 * Extração client-side de frames de vídeo de tomografia (scroll/cine TC).
 * Usa HTMLVideoElement + canvas — não depende de ffmpeg no browser/Vercel.
 */

export type ExtractedVideoFrame = {
  /** data URL JPEG */
  dataUrl: string
  /** timestamp em segundos */
  timeSec: number
  /** índice 0-based na amostragem */
  index: number
}

export type ExtractVideoFramesResult = {
  frames: ExtractedVideoFrame[]
  durationSec: number
  width: number
  height: number
  sourceName: string
  mimeType: string
}

export type ExtractVideoFramesOptions = {
  /** Máximo de frames amostrados (default 8) */
  maxFrames?: number
  /** Largura máxima do frame (default 896) */
  maxWidth?: number
  /** Qualidade JPEG 0–1 (default 0.82) */
  jpegQuality?: number
  /** Callback de progresso 0–100 */
  onProgress?: (pct: number) => void
}

const DEFAULT_MAX_FRAMES = 8
const DEFAULT_MAX_WIDTH = 896
const DEFAULT_JPEG_QUALITY = 0.82

function waitEvent(target: EventTarget, event: string, errorEvent = 'error'): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOk = () => {
      cleanup()
      resolve()
    }
    const onErr = () => {
      cleanup()
      reject(new Error(`Falha ao carregar vídeo (${event})`))
    }
    const cleanup = () => {
      target.removeEventListener(event, onOk)
      target.removeEventListener(errorEvent, onErr)
    }
    target.addEventListener(event, onOk, { once: true })
    target.addEventListener(errorEvent, onErr, { once: true })
  })
}

async function seekVideo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  if (Math.abs(video.currentTime - timeSec) < 0.01) return
  const seeked = waitEvent(video, 'seeked')
  video.currentTime = Math.min(Math.max(0, timeSec), Math.max(0, video.duration - 0.05))
  await seeked
}

function sampleTimestamps(durationSec: number, maxFrames: number): number[] {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return [0]
  const n = Math.max(1, Math.min(maxFrames, Math.ceil(durationSec * 2) || maxFrames))
  if (n === 1) return [Math.min(0.1, durationSec / 2)]
  const times: number[] = []
  for (let i = 0; i < n; i++) {
    // evita exatamente 0 e o fim (frames pretos em alguns players)
    const t = (durationSec * (i + 0.5)) / n
    times.push(Math.min(durationSec - 0.04, Math.max(0.02, t)))
  }
  return times
}

export function isVideoFile(file: File): boolean {
  const name = file.name.toLowerCase()
  if (file.type.startsWith('video/')) return true
  return (
    name.endsWith('.mp4') ||
    name.endsWith('.webm') ||
    name.endsWith('.mov') ||
    name.endsWith('.m4v') ||
    name.endsWith('.mkv')
  )
}

/**
 * Extrai frames uniformemente espaçados de um arquivo de vídeo.
 * Deve rodar no browser (DOM).
 */
export async function extractVideoFrames(
  file: File,
  options: ExtractVideoFramesOptions = {},
): Promise<ExtractVideoFramesResult> {
  if (typeof document === 'undefined') {
    throw new Error('extractVideoFrames só funciona no browser')
  }

  const maxFrames = options.maxFrames ?? DEFAULT_MAX_FRAMES
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH
  const jpegQuality = options.jpegQuality ?? DEFAULT_JPEG_QUALITY
  const onProgress = options.onProgress

  const objectUrl = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.src = objectUrl

  try {
    await waitEvent(video, 'loadedmetadata')
    // alguns browsers precisam de load extra
    if (video.readyState < 1) {
      await waitEvent(video, 'loadeddata')
    }

    const durationSec = Number.isFinite(video.duration) ? video.duration : 0
    if (durationSec <= 0 || durationSec > 600) {
      throw new Error(
        durationSec <= 0
          ? 'Não foi possível ler a duração do vídeo.'
          : 'Vídeo muito longo (máx. 10 min). Exporte um trecho da série TC.',
      )
    }

    const times = sampleTimestamps(durationSec, maxFrames)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponível neste navegador')

    const frames: ExtractedVideoFrame[] = []
    let outW = video.videoWidth || 512
    let outH = video.videoHeight || 512

    for (let i = 0; i < times.length; i++) {
      const t = times[i]!
      await seekVideo(video, t)

      const vw = video.videoWidth || outW
      const vh = video.videoHeight || outH
      const scale = vw > maxWidth ? maxWidth / vw : 1
      outW = Math.max(1, Math.round(vw * scale))
      outH = Math.max(1, Math.round(vh * scale))
      canvas.width = outW
      canvas.height = outH
      ctx.drawImage(video, 0, 0, outW, outH)

      const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality)
      frames.push({ dataUrl, timeSec: Number(t.toFixed(3)), index: i })
      onProgress?.(Math.round(((i + 1) / times.length) * 100))
    }

    if (frames.length === 0) {
      throw new Error('Nenhum frame pôde ser extraído do vídeo.')
    }

    return {
      frames,
      durationSec: Number(durationSec.toFixed(3)),
      width: outW,
      height: outH,
      sourceName: file.name,
      mimeType: file.type || 'video/mp4',
    }
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(objectUrl)
  }
}
