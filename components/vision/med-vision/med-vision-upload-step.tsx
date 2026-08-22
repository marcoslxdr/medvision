'use client'

import { useState, useCallback, useRef, useId } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { Upload, X, AlertCircle, FileImage, RotateCcw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { extractDicomPreview, isDicomFile } from '@/lib/vision/dicom-preview'
import { extractVideoFrames, isVideoFile } from '@/lib/vision/extract-video-frames'

/** Tipos de imagem/vídeo aceitos (RX, TC, foto, DICOM, vídeo de série TC). */
const DEFAULT_ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/dicom': ['.dcm', '.dicom'],
  'application/octet-stream': ['.dcm', '.dicom'],
  'video/mp4': ['.mp4', '.m4v'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
}

const ACCEPTED_LABELS: Record<string, string> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'application/dicom': 'DICOM',
  'video/mp4': 'MP4',
  'video/webm': 'WEBM',
  'video/quicktime': 'MOV',
}

/** Tipos MIME comuns que devem ser rejeitados com mensagem amigável. */
const REJECTED_TYPE_LABELS: Record<string, string> = {
  'image/gif': 'GIF',
  'image/bmp': 'BMP',
  'image/tiff': 'TIFF',
  'image/svg+xml': 'SVG',
}

export type UploadFile = {
  id: string
  file: File
  base64: string
  previewUrl: string
  /** frames extras (vídeo TC) */
  seriesFrames?: string[]
  sourceType?: 'image' | 'video' | 'dicom'
  videoMeta?: {
    durationSec: number
    frameCount: number
    sourceName: string
    timestampsSec: number[]
  }
}

type MedVisionUploadStepProps = {
  /** Chamado quando uma (ou mais) imagens são aceitas. */
  onImagesAccepted: (files: UploadFile[]) => void
  /** Tipos MIME aceitos. Default: JPEG, PNG, WEBP. */
  acceptedTypes?: Record<string, string[]>
  /** Tamanho máximo por arquivo em MB. Default: 10 (vídeo usa até 80). */
  maxSizeMB?: number
  /** Número máximo de arquivos. Default: 1. */
  maxFiles?: number
  /** Classes CSS adicionais. */
  className?: string
  /** Texto descritivo para o dropzone. */
  description?: string
  /** Estado externo de progresso (0-100) para upload/processamento. */
  progress?: number
  /** Label do progresso (ex: "Processando imagem..."). */
  progressLabel?: string
  /** Se true, mostra estado de loading com skeleton. */
  isLoading?: boolean
  /** Erro externo. Se presente, mostra estado de erro. */
  error?: string | null
  /** Callback para retry em caso de erro. */
  onRetry?: () => void
  /** Callback para reset (nova imagem). */
  onReset?: () => void
}

/** Gera ID único curto. */
let _idCounter = 0
function uid(): string {
  _idCounter += 1
  return `upload-${Date.now().toString(36)}-${_idCounter.toString(36)}`
}

/** Lê um File como base64 data URL. */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (err) => reject(err)
  })
}

/** Retorna label legível para os tipos aceitos. */
function formatAcceptedLabels(accepted: Record<string, string[]>): string {
  const labels = Object.keys(accepted).map((mime) => ACCEPTED_LABELS[mime] || mime)
  return labels.join(', ')
}

export function MedVisionUploadStep({
  onImagesAccepted,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxSizeMB = 80,
  maxFiles = 1,
  className,
  description = 'Radiografia, tomografia, vídeo TC (MP4/WEBM) ou foto clínica',
  progress,
  progressLabel,
  isLoading = false,
  error = null,
  onRetry,
  onReset,
}: MedVisionUploadStepProps) {
  const dropzoneId = useId()
  const statusId = `${dropzoneId}-status`
  const hintId = `${dropzoneId}-hint`
  const errorId = `${dropzoneId}-error`

  const [files, setFiles] = useState<UploadFile[]>([])
  const [rejection, setRejection] = useState<string | null>(null)
  const [showCheck, setShowCheck] = useState(false)
  const [dicomNote, setDicomNote] = useState<string | null>(null)
  const rejectionTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const maxSizeBytes = maxSizeMB * 1024 * 1024

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      // Limpa rejeição anterior
      if (rejectionTimer.current) clearTimeout(rejectionTimer.current)
      setRejection(null)

      // Processa rejeições com mensagem amigável
      if (fileRejections.length > 0) {
        const first = fileRejections[0]
        const err = first.errors[0]
        let msg: string

        if (err.code === 'file-too-large') {
          msg = `Imagem muito grande. Máximo: ${maxSizeMB}MB.`
        } else if (err.code === 'file-invalid-type') {
          const mimeType = first.file.type
          const label = REJECTED_TYPE_LABELS[mimeType]
          if (label) {
            msg = `Formato ${label} não suportado. Use ${formatAcceptedLabels(acceptedTypes)}.`
          } else {
            msg = `Formato não suportado. Use ${formatAcceptedLabels(acceptedTypes)}.`
          }
        } else if (err.code === 'too-many-files') {
          msg = maxFiles === 1
            ? 'Apenas uma imagem por vez.'
            : `Máximo de ${maxFiles} imagens.`
        } else {
          msg = err.message
        }

        setRejection(msg)
        rejectionTimer.current = setTimeout(() => setRejection(null), 5000)
        return
      }

      if (acceptedFiles.length === 0) return

      try {
        setDicomNote(null)
        const newFiles: UploadFile[] = await Promise.all(
          acceptedFiles.map(async (file) => {
            if (isDicomFile(file)) {
              const preview = await extractDicomPreview(file)
              if (!preview.ok) {
                throw new Error(preview.message)
              }
              setDicomNote(
                preview.message ||
                  'DICOM detectado — preview do primeiro frame. Conversão server-side completa em breve.',
              )
              return {
                id: uid(),
                file,
                base64: preview.previewDataUrl,
                previewUrl: preview.previewDataUrl,
                sourceType: 'dicom' as const,
              }
            }

            if (isVideoFile(file)) {
              const maxVideoMb = Math.max(maxSizeMB, 80)
              if (file.size > maxVideoMb * 1024 * 1024) {
                throw new Error(`Vídeo muito grande. Máximo: ${maxVideoMb}MB.`)
              }
              setDicomNote('Extraindo cortes do vídeo de tomografia…')
              const extracted = await extractVideoFrames(file, {
                maxFrames: 8,
                maxWidth: 896,
                jpegQuality: 0.82,
              })
              const frames = extracted.frames.map((f) => f.dataUrl)
              setDicomNote(
                `Vídeo TC: ${extracted.frames.length} cortes amostrados (~${extracted.durationSec.toFixed(1)}s).`,
              )
              return {
                id: uid(),
                file,
                base64: frames[0]!,
                previewUrl: frames[0]!,
                seriesFrames: frames,
                sourceType: 'video' as const,
                videoMeta: {
                  durationSec: extracted.durationSec,
                  frameCount: frames.length,
                  sourceName: extracted.sourceName,
                  timestampsSec: extracted.frames.map((f) => f.timeSec),
                },
              }
            }

            const base64 = await readFileAsBase64(file)
            return {
              id: uid(),
              file,
              base64,
              previewUrl: URL.createObjectURL(file),
              sourceType: 'image' as const,
            }
          }),
        )

        // Multi: adiciona aos existentes. Single: substitui.
        const updated = maxFiles === 1 ? newFiles : [...files, ...newFiles].slice(0, maxFiles)
        setFiles(updated)

        // Animação de check
        setShowCheck(true)
        setTimeout(() => setShowCheck(false), 1500)

        onImagesAccepted(updated)
      } catch (err) {
        setRejection(
          err instanceof Error
            ? err.message
            : 'Erro ao processar imagem. Tente outro arquivo.',
        )
      }
    },
    [acceptedTypes, files, maxFiles, maxSizeMB, onImagesAccepted],
  )

  const removeFile = useCallback(
    (id: string) => {
      const updated = files.filter((f) => f.id !== id)
      setFiles(updated)
      if (updated.length === 0) {
        setDicomNote(null)
        onReset?.()
      } else {
        onImagesAccepted(updated)
      }
    },
    [files, onImagesAccepted, onReset],
  )

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize: maxSizeBytes,
    maxFiles,
    multiple: maxFiles > 1,
    disabled: isLoading || files.length >= maxFiles,
  })

  const hasFiles = files.length > 0

  // ─── Estados especiais ───
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn('w-full space-y-4', className)}
        role="status"
        aria-label={progressLabel || 'Processando'}
      >
        <div className="rounded-xl border border-rule bg-surface-raised p-6 space-y-4">
          {/* Skeleton thumbnail */}
          <div className="aspect-video w-full max-w-sm mx-auto rounded-lg bg-surface animate-pulse" />
          {progress !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progressLabel || 'Processando...'}</span>
                <span className="tabular-nums font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('w-full', className)}
        role="alert"
        aria-labelledby={errorId}
      >
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <div className="min-w-0 flex-1 space-y-1.5">
              <p id={errorId} className="text-sm font-semibold text-destructive">
                Erro no upload
              </p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg gap-1.5 text-xs"
                onClick={onRetry}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Tentar novamente
              </Button>
            )}
            {onReset && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-lg text-xs"
                onClick={() => {
                  setFiles([])
                  onReset()
                }}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Nova imagem
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* ─── Dropzone ─── */}
      {!hasFiles && (
        <div
          {...getRootProps()}
          className="outline-none"
          aria-labelledby={hintId}
          aria-describedby={statusId}
        >
          <motion.div
            whileTap={{ scale: 0.98 }}
            className={cn(
              'relative cursor-pointer rounded-xl border-2 border-dashed bg-surface-raised p-8 md:p-12 text-center transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
              isDragAccept && 'border-clinical-ok bg-clinical-ok/8',
              isDragReject && 'border-clinical-alert bg-clinical-alert/5',
              isDragActive && !isDragAccept && !isDragReject && 'border-signal/50 bg-signal/5',
              !isDragActive && 'border-rule hover:border-signal/35 hover:bg-surface',
            )}
          >
            <input {...getInputProps()} />

            {/* Ícone animado */}
            <motion.div
              animate={
                isDragAccept
                  ? { scale: 1.15, y: -2 }
                  : isDragReject
                    ? { rotate: [-2, 2, -2, 2, 0] }
                    : { scale: 1, y: 0 }
              }
              transition={isDragReject ? { duration: 0.4 } : { type: 'spring', stiffness: 400, damping: 20 }}
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-rule bg-surface"
            >
              {isDragReject ? (
                <AlertCircle className="h-7 w-7 text-clinical-alert" aria-hidden />
              ) : isDragAccept ? (
                <CheckCircle2 className="h-7 w-7 text-clinical-ok" aria-hidden />
              ) : (
                <Upload className="h-7 w-7 text-signal" aria-hidden />
              )}
            </motion.div>

            <p className="text-sm font-semibold text-ink">
              Arraste a imagem aqui ou clique para selecionar
            </p>
            <p id={hintId} className="mt-1.5 text-xs text-ink-muted">
              {description} &middot; {formatAcceptedLabels(acceptedTypes)} &middot; máx {maxSizeMB}MB
            </p>
          </motion.div>
        </div>
      )}

      {/* ─── Status aria-live ─── */}
      <div id={statusId} className="sr-only" aria-live="polite" role="status">
        {rejection
          ? rejection
          : showCheck
            ? `Imagem${maxFiles > 1 ? 's' : ''} selecionada${maxFiles > 1 ? 's' : ''} com sucesso.`
            : hasFiles
              ? `${files.length} de ${maxFiles} imagem${maxFiles > 1 ? 'ns' : ''} selecionada${maxFiles > 1 ? 's' : ''}.`
              : ''}
      </div>

      {/* ─── Rejeição ─── */}
      <AnimatePresence>
        {rejection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            role="alert"
          >
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                <p className="text-xs font-medium text-destructive">{rejection}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Nota DICOM ─── */}
      <AnimatePresence>
        {dicomNote && hasFiles && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-signal/25 bg-signal/5 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <FileImage className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
                <p className="text-xs text-ink-muted">{dicomNote}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Preview + Lista ─── */}
      <AnimatePresence>
        {hasFiles && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            {/* Single file: thumbnail grande */}
            {maxFiles === 1 && files[0] && (
              <div className="rounded-xl border border-rule bg-surface-raised p-4 space-y-3">
                <p className="text-xs font-medium text-ink-muted">Imagem selecionada</p>
                <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-lg border border-rule bg-surface">
                  <img
                    src={files[0].previewUrl}
                    alt="Preview da imagem selecionada"
                    className="h-auto max-h-64 w-full object-contain"
                  />
                  {/* Check animado sobre a imagem */}
                  <AnimatePresence>
                    {showCheck && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        className="absolute inset-0 flex items-center justify-center rounded-lg bg-ink/20"
                      >
                        <CheckCircle2 className="h-10 w-10 text-clinical-ok" aria-hidden />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {files[0].file.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {!isLoading && (
                      <div
                        {...getRootProps()}
                        className="outline-none"
                        aria-label="Trocar imagem"
                      >
                        <input {...getInputProps()} />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                          asChild
                        >
                          <span>Trocar imagem</span>
                        </Button>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                      onClick={() => removeFile(files[0].id)}
                      aria-label="Remover imagem"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Multi-file: grid de thumbnails */}
            {maxFiles > 1 && (
              <div className="rounded-xl border border-rule bg-surface-raised p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {files.length} de {maxFiles} imagem{maxFiles > 1 ? 'ns' : ''} selecionada{maxFiles > 1 ? 's' : ''}
                  </p>
                  {files.length < maxFiles && !isLoading && (
                    <div {...getRootProps()} className="outline-none">
                      <input {...getInputProps()} />
                      <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                        + Adicionar
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {files.map((f, idx) => (
                    <div
                      key={f.id}
                      className="group relative overflow-hidden rounded-lg border border-border/50 bg-muted/20"
                    >
                      <img
                        src={f.previewUrl}
                        alt={`Imagem ${idx + 1}`}
                        className="aspect-square w-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-[11px] font-medium text-white truncate">
                          {idx + 1}. {f.file.name}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/40 text-white opacity-0 transition-opacity hover:bg-black/60 group-hover:opacity-100"
                        onClick={() => removeFile(f.id)}
                        aria-label={`Remover imagem ${idx + 1}`}
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progresso (externo) */}
            {progress !== undefined && progress < 100 && (
              <div className="space-y-2 px-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{progressLabel || 'Processando...'}</span>
                  <span className="tabular-nums font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
