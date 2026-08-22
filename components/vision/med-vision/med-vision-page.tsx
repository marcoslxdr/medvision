'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
    Search,
    Scan,
    AlertCircle,
    CheckCircle2,
    Download,
    RefreshCcw,
    Maximize2,
    Loader2,
    ChevronRight,
    AlertTriangle,
    Save,
    ExternalLink,
    Pencil,
    Tag,
    ChevronDown,
    ChevronUp,
    Image as ImageIcon,
    Wrench,
    FileText,
    Microscope,
    Info,
    GitBranch,
    X,
    PenLine,
} from 'lucide-react'
import type { UploadFile } from '@/components/vision/med-vision'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { getSeverityStyle } from '@/lib/constants/vision'
import { VisionAnalysisResult, VisionArtifactContent, VisionRefinement, BoundingBox } from '@/lib/types/vision'
import { persistVisionImage } from '@/lib/vision/persist-vision-image'
import { DEFAULT_REPORT_SECTIONS } from '@/lib/constants/vision-analysis-options'
import type { MedVisionAnalysisConfig } from '@/lib/types/vision-analysis-request'
import { ImageOverlay } from '@/components/vision/image-overlay'
import { InadequateImageError } from '@/components/vision/inadequate-image-error'
import { AnnotationToolbar } from '@/components/vision/annotation-toolbar'
import { AnnotationCanvas } from '@/components/vision/annotation-canvas'
import { RegionSelector } from '@/components/vision/region-selector'
import { validateImageQuality, compressImageForAnalysis, ImageQualityResult } from '@/lib/utils/image-quality-validator'
import { useAnnotations } from '@/lib/hooks/use-annotations'
import { useSoundNotification } from '@/lib/hooks/use-sound-notification'
import { toast } from 'sonner'
import { generateVisionPDF } from '@/lib/utils/generate-vision-pdf'
import { fetchVisionPdfSigner } from '@/lib/utils/fetch-vision-pdf-signer'
import { runVisionAnalysis } from '@/lib/vision/run-vision-analysis'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
    AnalyzingStage,
    MedVisionConfigureStep,
    MedVisionReviewStep,
    MedVisionStepIndicator,
    VisionClinicalDisclaimer,
    VisionErrorBanner,
    VisionErrorRecovery,
    type VisionState,
} from '@/components/vision/med-vision'

const DEFAULT_ANALYSIS_CONFIG: MedVisionAnalysisConfig = {
    specialty: 'geral',
    clinicalContext: '',
    modality: 'rx',
    reportDepth: 'completo',
    focusTags: [],
    reportSections: { ...DEFAULT_REPORT_SECTIONS },
}

export default function MedVisionPage() {
    const router = useRouter()
    const { playSuccess } = useSoundNotification()
    const [state, setState] = useState<VisionState>('CONFIGURE')
    const [image, setImage] = useState<string | null>(null)
    const [originalImage, setOriginalImage] = useState<string | null>(null)
    const [seriesFrames, setSeriesFrames] = useState<string[] | null>(null)
    const [videoMeta, setVideoMeta] = useState<{
        durationSec: number
        frameCount: number
        sourceName: string
        timestampsSec: number[]
    } | null>(null)
    const [sourceType, setSourceType] = useState<'image' | 'video' | 'dicom' | null>(null)
    const [progress, setProgress] = useState(0)
    const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null)
    const [analysisPrecision, setAnalysisPrecision] = useState<number | null>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isPresentationMode, setIsPresentationMode] = useState(false)
    const [showHeatmap, setShowHeatmap] = useState(false)
    const [isSaved, setIsSaved] = useState(false)
    const [saveFailed, setSaveFailed] = useState(false)
    const [savedArtifactId, setSavedArtifactId] = useState<string | null>(null)
    const [isSigned, setIsSigned] = useState(false)
    const [isSigning, setIsSigning] = useState(false)
    const [isComparing, setIsComparing] = useState(false)
    const [comparisonItems, setComparisonItems] = useState<VisionAnalysisResult[]>([])
    const [previousAnalyses, setPreviousAnalyses] = useState<{id: string; title: string; date: string; content: any}[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [config, setConfig] = useState<MedVisionAnalysisConfig>(DEFAULT_ANALYSIS_CONFIG)

    // Quality validation state
    const [qualityResult, setQualityResult] = useState<ImageQualityResult | null>(null)

    // Inadequate image error state
    const [inadequateImageError, setInadequateImageError] = useState<{ reason: string; details?: string } | null>(null)

    // Annotation state
    const [isAnnotating, setIsAnnotating] = useState(false)
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
    const {
        annotations,
        currentAnnotation,
        activeTool,
        activeColor,
        canUndo,
        canRedo,
        setActiveTool,
        setActiveColor,
        startAnnotation,
        updateAnnotation,
        finishAnnotation,
        cancelAnnotation,
        undo,
        redo,
        clear: clearAnnotations,
    } = useAnnotations()

    // Refinement state
    const [isSelectingRegion, setIsSelectingRegion] = useState(false)
    const [refinements, setRefinements] = useState<VisionRefinement[]>([])
    const [isRefining, setIsRefining] = useState(false)
    const [expandedRefinement, setExpandedRefinement] = useState<number | null>(null)
    const [advancedToolsOpen, setAdvancedToolsOpen] = useState(false)
    /** Após análise: laudo (padrão), radiografia ou conduta. */
    const [resultMainTab, setResultMainTab] = useState<'image' | 'laudo' | 'conduta'>('laudo')

    // Internal save implementation — uploads full image; JSONB keeps thumbnail + URL
    const performSave = useCallback(async (
        imageSrc: string,
        analysisData: VisionAnalysisResult,
        currentAnnotations = annotations,
        currentRefinements: VisionRefinement[] = []
    ): Promise<string> => {
        const persisted = await persistVisionImage(imageSrc)
        const imageType = analysisData.meta?.imageType || 'Imagem'
        const date = new Date().toLocaleDateString('pt-BR')
        const patientKey = config.patientKey?.trim() || undefined

        const content: VisionArtifactContent = {
            thumbnailBase64: persisted.thumbnailBase64,
            ...(persisted.imageUrl ? { imageUrl: persisted.imageUrl } : {}),
            ...(persisted.imageBase64 ? { imageBase64: persisted.imageBase64 } : {}),
            analysis: analysisData,
            annotations: currentAnnotations,
            analyzedAt: new Date().toISOString(),
            refinements: currentRefinements,
        }

        const metadata: Record<string, unknown> = {}
        if (patientKey) metadata.patientKey = patientKey

        const response = await fetch('/api/artifacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: `Laudo Med Vision: ${imageType} - ${date}`,
                description: analysisData.report?.diagnosticHypothesis?.slice(0, 200) || 'Análise de imagem (radiografia ou tomografia)',
                type: 'vision',
                content,
                metadata,
            })
        })

        if (!response.ok) {
            const errBody = await response.json().catch(() => null)
            throw new Error(errBody?.error || `Falha ao salvar (${response.status})`)
        }

        const artifact = await response.json() as { id?: string }
        if (!artifact?.id) {
            throw new Error('Laudo salvo sem identificador')
        }
        setSavedArtifactId(artifact.id)
        return artifact.id
    }, [annotations, config.patientKey])

    // Manual save triggered by user button
    const saveToLibrary = useCallback(async () => {
        if (!analysisResult || !image || isSaving || isSaved) return

        setIsSaving(true)
        setSaveFailed(false)
        try {
            await performSave(image, analysisResult, annotations, refinements)
            setIsSaved(true)
            setSaveFailed(false)
            toast.success('Laudo salvo', {
                action: {
                    label: 'Ver em Laudos',
                    onClick: () => router.push('/dashboard/laudos')
                }
            })
        } catch (error) {
            console.error('Error saving:', error)
            setSaveFailed(true)
            toast.error(error instanceof Error ? error.message : 'Erro ao salvar o laudo', {
                action: {
                    label: 'Tentar de novo',
                    onClick: () => { void saveToLibrary() },
                },
            })
        } finally {
            setIsSaving(false)
        }
    }, [analysisResult, image, isSaving, isSaved, annotations, refinements, performSave, router])

    const signLaudo = useCallback(async () => {
        if (!savedArtifactId || isSigning || isSigned) return
        setIsSigning(true)
        try {
            const res = await fetch(`/api/laudos/${savedArtifactId}/sign`, {
                method: 'POST',
            })
            const body = await res.json().catch(() => null)
            if (!res.ok) {
                throw new Error(body?.error || `Falha ao assinar (${res.status})`)
            }
            setIsSigned(true)
            toast.success('Laudo assinado', {
                description: body?.signerName
                    ? `${body.signerName}${body.signerCrm ? ` · CRM ${body.signerCrm}` : ''}`
                    : undefined,
            })
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao assinar laudo')
        } finally {
            setIsSigning(false)
        }
    }, [savedArtifactId, isSigning, isSigned])


    // Recorte de região para refinamento (resultado)
    const cropRegionFromImage = useCallback(async (imageSrc: string, box: BoundingBox): Promise<string> => {
        const img = new Image()
        img.src = imageSrc
        await new Promise((resolve) => { img.onload = resolve })

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get canvas context')

        const cropX = (box.xmin / 100) * img.naturalWidth
        const cropY = (box.ymin / 100) * img.naturalHeight
        const cropW = ((box.xmax - box.xmin) / 100) * img.naturalWidth
        const cropH = ((box.ymax - box.ymin) / 100) * img.naturalHeight

        canvas.width = cropW
        canvas.height = cropH
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
        return canvas.toDataURL('image/jpeg', 0.92)
    }, [])

    const handleImagesAccepted = useCallback(async (uploadedFiles: UploadFile[]) => {
        const uploadFile = uploadedFiles[0]
        if (uploadFile) {
            try {
                const isVideo = uploadFile.sourceType === 'video' && (uploadFile.seriesFrames?.length ?? 0) > 0
                if (isVideo) {
                    const frames = uploadFile.seriesFrames!
                    setSeriesFrames(frames)
                    setVideoMeta(uploadFile.videoMeta ?? null)
                    setSourceType('video')
                    setOriginalImage(frames[0]!)
                    setImage(frames[0]!)
                    // TC por padrão quando upload é vídeo de série
                    setConfig((prev) => (prev.modality === 'rx' ? { ...prev, modality: 'tc' } : prev))
                    const result = await validateImageQuality(frames[0]!)
                    setQualityResult(result)
                    toast.success(`Vídeo TC: ${frames.length} cortes prontos para análise`)
                    setState('CONFIGURE')
                    return
                }

                setSeriesFrames(null)
                setVideoMeta(null)
                setSourceType(uploadFile.sourceType ?? 'image')
                const compressed = await compressImageForAnalysis(uploadFile.base64, 1024, 0.85)
                setOriginalImage(compressed)
                setImage(compressed)
                const result = await validateImageQuality(compressed)
                setQualityResult(result)
                setState('CONFIGURE')
            } catch (error) {
                console.error("Error processing image:", error)
                toast.error("Erro ao processar imagem/vídeo. Tente outro arquivo.")
                setState('CONFIGURE')
            }
        }
    }, [])

    const patchConfig = useCallback((patch: Partial<MedVisionAnalysisConfig>) => {
        setConfig((prev) => ({ ...prev, ...patch }))
    }, [])

    const buildAnalysisBody = useCallback(
        (imageData: string, extra?: Record<string, unknown>) => {
            const useSeries = Boolean(seriesFrames && seriesFrames.length > 1)
            return {
                image: imageData,
                ...(useSeries
                    ? {
                          images: seriesFrames!,
                          sourceType: sourceType ?? 'video',
                          videoMeta: videoMeta ?? undefined,
                          modality: config.modality === 'rx' ? 'tc' : config.modality,
                      }
                    : {
                          sourceType: sourceType ?? 'image',
                      }),
                specialty: config.specialty,
                clinicalContext: config.clinicalContext.trim() || undefined,
                modality: useSeries && config.modality === 'rx' ? 'tc' : config.modality,
                reportDepth: config.reportDepth,
                focusTags: config.focusTags.length ? config.focusTags : undefined,
                patientAge: config.patientAge,
                patientSex: config.patientSex,
                reportSections: config.reportSections,
                ...extra,
            }
        },
        [config, seriesFrames, sourceType, videoMeta],
    )

    const startSingleAnalysis = async (imageData: string) => {
        setState('ANALYZING')
        setProgress(0)
        setAnalysisResult(null)
        setAnalysisPrecision(null)
        // Progress com desaceleração natural — não trava mais nos 90%
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) return prev
                // Incremento diminui conforme avança: rápido no início, lento no fim
                const increment = prev < 30 ? 4 : prev < 60 ? 3 : prev < 80 ? 1.5 : 0.5
                return Math.min(95, prev + increment)
            })
        }, 500)

        try {
            const data = await runVisionAnalysis(buildAnalysisBody(imageData)) as VisionAnalysisResult & { precision?: number }

            clearInterval(interval)
            setProgress(100)
            setAnalysisResult(data)
            setAnalysisPrecision(data.precision ?? null)

            performSave(imageData, data, []).then(() => {
                setIsSaved(true)
                setSaveFailed(false)
            }).catch((err) => {
                console.error('Auto-save failed:', err)
                setSaveFailed(true)
                setIsSaved(false)
                toast.error('Laudo não salvo automaticamente', {
                    description: err instanceof Error ? err.message : 'Tente salvar manualmente.',
                    action: {
                        label: 'Salvar agora',
                        onClick: () => {
                            void performSave(imageData, data, []).then(() => {
                                setIsSaved(true)
                                setSaveFailed(false)
                                toast.success('Laudo salvo')
                            }).catch((retryErr) => {
                                toast.error(retryErr instanceof Error ? retryErr.message : 'Falha ao salvar')
                            })
                        },
                    },
                })
            })

            setTimeout(() => {
                setResultMainTab('laudo')
                setAdvancedToolsOpen(false)
                setState('RESULT')
                playSuccess()
            }, 500)

        } catch (error) {
            clearInterval(interval)
            console.error(error)
            const msg = error instanceof Error ? error.message : 'Erro desconhecido'
            if (msg === 'UNAUTHORIZED') {
                router.push('/login')
                return
            }
            const code = (error as Error & { code?: string })?.code
            if (code === 'INADEQUATE_IMAGE') {
                setInadequateImageError({
                    reason: msg,
                    details: typeof (error as Error & { details?: unknown })?.details === 'string'
                        ? (error as Error & { details?: string }).details
                        : undefined,
                })
            }
            toast.error(`Erro na análise: ${msg}`)
            setState('ERROR')
        }
    }

    // Helper to retry analysis with exponential backoff
    const retryAnalysis = async (
        imageData: string,
        maxRetries = 2
    ): Promise<VisionAnalysisResult | null> => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await runVisionAnalysis(buildAnalysisBody(imageData))
            } catch (e) {
                if (attempt >= maxRetries) {
                    throw e
                }
                const delay = Math.pow(2, attempt) * 1000
                await new Promise(r => setTimeout(r, delay))
            }
        }
        return null
    }

    const startAnalysis = (imageData: string) => {
        startSingleAnalysis(imageData)
    }

    // Handle region refinement
    const handleRegionSelected = useCallback(async (box: BoundingBox) => {
        if (!image || !analysisResult) return

        setIsSelectingRegion(false)
        setIsRefining(true)

        try {
            const regionImage = await cropRegionFromImage(image, box)

            // Build summary of original analysis for context
            const findingsSummary = analysisResult.findings.map(f => `${f.type} (${f.level})`).join(', ') || 'Nenhum achado relevante'
            const originalAnalysisSummary = `Tipo: ${analysisResult.meta?.imageType || 'N/A'}. Achados: ${findingsSummary}. Hipótese: ${analysisResult.report?.diagnosticHypothesis?.slice(0, 200) || 'N/A'}`

            const refinedData = await runVisionAnalysis(
                buildAnalysisBody(regionImage, {
                    mode: 'refine',
                    originalAnalysisSummary,
                }),
            )

            const newRefinement: VisionRefinement = {
                regionBox: box,
                regionImageBase64: regionImage,
                analysis: refinedData,
                analyzedAt: new Date().toISOString(),
            }

            setRefinements(prev => {
                const updated = [...prev, newRefinement]
                setExpandedRefinement(updated.length - 1) // auto-expand the new one
                return updated
            })
            toast.success('Região re-analisada com sucesso!')
            setState('RESULT')
            playSuccess()
        } catch (err) {
            toast.error(`Erro ao refinar região: ${err}`)
        } finally {
            setIsRefining(false)
        }
    }, [image, analysisResult, buildAnalysisBody, cropRegionFromImage])

    const removeRefinement = useCallback((index: number) => {
        setRefinements(prev => prev.filter((_, i) => i !== index))
        setExpandedRefinement(prev => prev === index ? null : prev !== null && prev > index ? prev - 1 : prev)
    }, [])

    const openComparisonPicker = useCallback(async () => {
        setIsComparing(true)
        try {
            const res = await fetch('/api/artifacts?type=vision&limit=20')
            const data = await res.json()
            if (data.items) {
                setPreviousAnalyses(
                    data.items.map((item: { id: string; title: string; createdAt: string; content: unknown }) => ({
                        id: item.id,
                        title: item.title,
                        date: new Date(item.createdAt).toLocaleDateString('pt-BR'),
                        content: item.content,
                    })),
                )
            }
        } catch (e) {
            console.error('Error loading previous analyses:', e)
            toast.error('Não foi possível carregar análises anteriores.')
        }
    }, [])

    const reset = () => {
        setState('CONFIGURE')
        setImage(null)
        setOriginalImage(null)
        setProgress(0)
        setAnalysisResult(null)
        setAnalysisPrecision(null)
        setIsSaved(false)
        setIsSaving(false)
        setSavedArtifactId(null)
        setIsSigned(false)
        setIsSigning(false)
        setQualityResult(null)
        setIsAnnotating(false)
        setIsSelectingRegion(false)
        setRefinements([])
        setExpandedRefinement(null)
        setConfig(DEFAULT_ANALYSIS_CONFIG)
        setAdvancedToolsOpen(false)
        setInadequateImageError(null)
        clearAnnotations()
        setResultMainTab('laudo')
    }

    return (
        <div
            data-surface="product"
            className="mx-auto w-full min-w-0 max-w-6xl px-3 pb-4 pt-4 md:px-8 md:pb-20 md:pt-6"
        >
            {/* Header */}
            <header className="mb-5 md:mb-10 space-y-1.5">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 md:p-2 rounded-xl border border-rule bg-surface">
                        <Scan className="w-5 h-5 md:w-6 md:h-6 text-signal" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-heading font-semibold tracking-tight text-ink">
                        Med Vision
                    </h1>
                </div>
                <p className="max-w-2xl text-xs text-ink-muted md:text-base">
                    Envie radiografias, tomografias ou vídeo de série TC, revise achados e exporte o laudo.
                </p>
            </header>

            <div className="grid grid-cols-1 gap-8 min-w-0">
                <AnimatePresence mode="wait">
                    {state === 'ERROR' && (
                        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-6">
                            <MedVisionStepIndicator state={state} />
                            <VisionErrorBanner />
                            {inadequateImageError ? (
                                <InadequateImageError
                                    reason={inadequateImageError.reason}
                                    details={inadequateImageError.details}
                                    hasImage={Boolean(image)}
                                    onTryAgain={() => {
                                        setInadequateImageError(null)
                                        if (image) setState('REVIEW')
                                    }}
                                    onNewUpload={() => {
                                        setInadequateImageError(null)
                                        reset()
                                    }}
                                />
                            ) : (
                                <VisionErrorRecovery
                                    hasImage={Boolean(image)}
                                    onRetry={() => image && startAnalysis(image)}
                                    onBackToReview={() => setState('REVIEW')}
                                    onNewUpload={reset}
                                />
                            )}
                        </motion.div>
                    )}

                    {state === 'CONFIGURE' && (
                        <MedVisionConfigureStep
                            state={state}
                            originalImage={originalImage}
                            config={config}
                            onConfigChange={patchConfig}
                            qualityResult={qualityResult}
                            onImageAccepted={handleImagesAccepted}
                            onBack={() => {
                                setOriginalImage(null)
                                setImage(null)
                                setQualityResult(null)
                            }}
                            onContinue={() => {
                                if (originalImage) {
                                    setImage(originalImage)
                                    setState('REVIEW')
                                }
                            }}
                        />
                    )}

                    {state === 'REVIEW' && originalImage && image && (
                        <MedVisionReviewStep
                            state={state}
                            originalImage={originalImage}
                            image={image}
                            config={config}
                            onBack={() => setState('CONFIGURE')}
                            onAnalyze={startAnalysis}
                            onImageReady={setImage}
                        />
                    )}

                    {state === 'ANALYZING' && (
                        <motion.div
                            key="analyzing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="w-full motion-reduce:transition-none"
                        >
                            <AnalyzingStage state={state} image={image} progress={progress} />
                        </motion.div>
                    )}

                    {/* ─── RESULT ─── */}
                    {state === 'RESULT' && analysisResult && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col gap-8 max-w-6xl mx-auto w-full min-w-0"
                        >
                            <VisionClinicalDisclaimer />
                            {/* Quality badge (high precision) */}
                            {analysisPrecision !== null && analysisPrecision >= 80 && analysisResult.meta && (
                                <div className="flex items-center justify-end gap-2">
                                    <span className="text-[10px] text-muted-foreground">Qualidade da imagem:</span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-clinical-ok/10 text-clinical-ok border border-clinical-ok/30">
                                        {analysisResult.meta.quality} · {analysisPrecision}%
                                    </span>
                                </div>
                            )}

                            {/* Precision/Quality Banner */}
                            {analysisPrecision !== null && analysisPrecision < 80 && (
                                <div className={cn(
                                    "p-4 rounded-xl border flex flex-col gap-3 sm:flex-row sm:items-start",
                                    analysisPrecision >= 60 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20"
                                )}>
                                    <AlertTriangle className={cn("w-5 h-5 shrink-0 sm:mt-0.5", analysisPrecision >= 60 ? "text-amber-500" : "text-red-400")} />
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <p className={cn("text-sm font-semibold break-words", analysisPrecision >= 60 ? "text-amber-500" : "text-red-400")}>
                                            Análise com precisão {analysisPrecision >= 60 ? 'limitada' : 'reduzida'} ({analysisPrecision}%)
                                        </p>
                                        {analysisResult.meta && (
                                            <span className={cn("inline-flex w-fit max-w-full text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", analysisPrecision >= 60 ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : "bg-red-500/10 text-red-400 border-red-400/30")}>
                                                Qualidade: {analysisResult.meta.quality}
                                            </span>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {analysisPrecision < 60
                                                ? 'A qualidade da imagem está abaixo do recomendado. Confirme com uma imagem de melhor qualidade.'
                                                : 'A qualidade pode afetar a confiabilidade de alguns achados.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Tabs
                                value={resultMainTab}
                                onValueChange={(v) => setResultMainTab(v as 'image' | 'laudo' | 'conduta')}
                                className="w-full flex flex-col gap-4"
                            >
                                <TabsList
                                    className="grid h-12 w-full max-w-2xl grid-cols-3 gap-0 rounded-xl border border-rule bg-surface p-1.5"
                                >
                                    <TabsTrigger
                                        value="laudo"
                                        className="gap-2 rounded-xl text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                                    >
                                        <FileText className="h-4 w-4 shrink-0" aria-hidden />
                                        <span>Laudo</span>
                                        {analysisResult.findings.length > 0 && (
                                            <span className="ml-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary">
                                                {analysisResult.findings.length}
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="image"
                                        className="gap-2 rounded-xl text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                                    >
                                        <ImageIcon className="h-4 w-4 shrink-0" aria-hidden />
                                        Radiografia
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="conduta"
                                        className="gap-2 rounded-xl text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                                    >
                                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                                        Conduta
                                        {analysisResult.report?.recommendations && analysisResult.report.recommendations.length > 0 && (
                                            <span className="ml-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary">
                                                {analysisResult.report.recommendations.length}
                                            </span>
                                        )}
                                    </TabsTrigger>
                                </TabsList>

                                <Collapsible
                                    open={advancedToolsOpen}
                                    onOpenChange={setAdvancedToolsOpen}
                                    className="w-full max-w-2xl"
                                >
                                    <CollapsibleTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-11 w-full justify-between rounded-xl px-4"
                                        >
                                            <span className="flex items-center gap-2 text-sm font-medium">
                                                <Wrench className="h-4 w-4 shrink-0" aria-hidden />
                                                Ferramentas avançadas
                                            </span>
                                            <ChevronDown
                                                className={cn(
                                                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none',
                                                    advancedToolsOpen && 'rotate-180',
                                                )}
                                                aria-hidden
                                            />
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pt-3">
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-11 justify-start gap-2 rounded-xl text-xs"
                                                onClick={() => setIsAnnotating(true)}
                                                disabled={isRefining || isSelectingRegion}
                                            >
                                                <Pencil className="h-4 w-4 shrink-0" />
                                                Anotar
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-11 justify-start gap-2 rounded-xl text-xs"
                                                onClick={() => setIsSelectingRegion(true)}
                                                disabled={isRefining || isAnnotating || isSelectingRegion}
                                            >
                                                <Microscope className="h-4 w-4 shrink-0" />
                                                Refinar região
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={cn(
                                                    'h-11 justify-start gap-2 rounded-xl text-xs',
                                                    showHeatmap && 'border-red-500/40 bg-red-500/10',
                                                )}
                                                onClick={() => setShowHeatmap(!showHeatmap)}
                                            >
                                                Mapa de calor
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={cn(
                                                    'h-11 justify-start gap-2 rounded-xl text-xs',
                                                    isPresentationMode && 'border-primary/40 bg-primary/10',
                                                )}
                                                onClick={() => setIsPresentationMode(!isPresentationMode)}
                                            >
                                                Modo apresentação
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-11 justify-start gap-2 rounded-xl text-xs"
                                                onClick={() => setIsFullscreen(true)}
                                            >
                                                <Maximize2 className="h-4 w-4 shrink-0" />
                                                Tela cheia
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-11 justify-start gap-2 rounded-xl text-xs"
                                                onClick={openComparisonPicker}
                                            >
                                                Comparar análises
                                            </Button>
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>

                                <TabsContent value="image" className="mt-0 space-y-4 outline-none">
                                <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-1">
                                    <div
                                        className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border/50 bg-black/5 min-w-0"
                                        ref={(el) => {
                                            if (el && (el.offsetWidth !== imageSize.width || el.offsetHeight !== imageSize.height)) {
                                                setImageSize({ width: el.offsetWidth, height: el.offsetHeight })
                                            }
                                        }}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            {image && (
                                                <ImageOverlay
                                                    src={image}
                                                    detections={analysisResult.detections}
                                                    annotations={annotations}
                                                    showHeatmap={showHeatmap}
                                                    showConfidenceFilter
                                                    reserveMobileToolbarSlot
                                                    useModernMarkers
                                                />
                                            )}
                                        </div>

                                        {/* Annotation Canvas */}
                                        {isAnnotating && imageSize.width > 0 && (
                                            <>
                                                <div className="absolute inset-0">
                                                    <AnnotationCanvas
                                                        width={imageSize.width}
                                                        height={imageSize.height}
                                                        annotations={annotations}
                                                        currentAnnotation={currentAnnotation}
                                                        activeTool={activeTool}
                                                        activeColor={activeColor}
                                                        isDrawing={!!currentAnnotation}
                                                        onStartDrawing={startAnnotation}
                                                        onDraw={updateAnnotation}
                                                        onEndDrawing={finishAnnotation}
                                                        onCancelDrawing={cancelAnnotation}
                                                    />
                                                </div>
                                                <AnnotationToolbar
                                                    activeTool={activeTool}
                                                    activeColor={activeColor}
                                                    canUndo={canUndo}
                                                    canRedo={canRedo}
                                                    onToolChange={setActiveTool}
                                                    onColorChange={setActiveColor}
                                                    onUndo={undo}
                                                    onRedo={redo}
                                                    onClear={clearAnnotations}
                                                    onClose={() => setIsAnnotating(false)}
                                                />
                                            </>
                                        )}

                                        {/* Region Selector */}
                                        {isSelectingRegion && !isAnnotating && (
                                            <RegionSelector
                                                onRegionSelected={handleRegionSelected}
                                                onCancel={() => setIsSelectingRegion(false)}
                                            />
                                        )}

                                        {/* Refining overlay */}
                                        {isRefining && (
                                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
                                                <div className="bg-background px-6 py-4 rounded-2xl border border-border shadow-xl flex flex-col items-center gap-3">
                                                    <Loader2 className="w-7 h-7 text-primary animate-spin" />
                                                    <div className="text-center">
                                                        <p className="font-bold text-sm">Re-analisando Região</p>
                                                        <p className="text-xs text-muted-foreground">Análise focada em andamento...</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </div>

                                {/* Tip for clickable balloons */}
                                {analysisResult.detections.length > 0 && (
                                    <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
                                        <Info className="w-3 h-3" />
                                        Clique nos balões de detecção para ver detalhes técnicos completos
                                    </p>
                                )}

                                {/* No findings state */}
                                {analysisResult.detections.length === 0 && (
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-clinical-ok/10 border border-clinical-ok/25">
                                        <CheckCircle2 className="w-5 h-5 text-clinical-ok shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-clinical-ok">Sem achados significativos</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">A análise não identificou patologias ou achados com confiança suficiente nesta imagem.</p>
                                        </div>
                                    </div>
                                )}

                                <Button variant="outline" className="w-full max-w-2xl rounded-xl h-12 gap-2" onClick={reset}>
                                    <RefreshCcw className="w-4 h-4" /> Analisar outra imagem
                                </Button>
                                </TabsContent>

                            {/* Laudo: texto e refinamentos (aba) */}
                                <TabsContent value="laudo" className="mt-0 w-full outline-none">
                            <div className="flex flex-col lg:flex-row gap-6 w-full">
                                <div className="lg:w-[40%] lg:sticky lg:top-24 lg:self-start space-y-4 min-w-0">
                                    <div className="rounded-xl border border-rule bg-surface-raised p-1">
                                        <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-rule bg-surface min-w-0">
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                {image && (
                                                    <ImageOverlay
                                                        src={image}
                                                        detections={analysisResult.detections}
                                                        annotations={annotations}
                                                        showHeatmap={showHeatmap}
                                                        showConfidenceFilter
                                                        useModernMarkers
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {analysisResult.detections.length > 0 && (
                                        <p className="text-[11px] text-ink-muted text-center">
                                            Imagem com achados marcados — revise ao lado antes de exportar.
                                        </p>
                                    )}
                                </div>
                                <div className="lg:w-[60%] min-w-0">
                            <div className="space-y-6 w-full">
                                <div className="rounded-xl border border-rule bg-surface-raised p-6 flex flex-col">
                                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/30">
                                        <div>
                                            <h2 className="text-xl font-heading font-bold">Laudo clínico</h2>
                                            <p className="text-xs text-muted-foreground">Texto completo e achados alinhados à radiografia</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            {analysisResult.meta && (
                                                <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                                    {analysisResult.meta.imageType}
                                                </Badge>
                                            )}
                                            {analysisPrecision !== null && (
                                                <Badge
                                                    variant="outline"
                                                    className={cn('text-[10px] h-5 px-1.5 font-bold',
                                                        analysisPrecision >= 80 ? 'bg-clinical-ok/10 text-clinical-ok border-clinical-ok/30'
                                                            : analysisPrecision >= 60 ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                                                : 'bg-red-500/10 text-red-400 border-red-400/30'
                                                    )}
                                                >
                                                    Precisão {analysisPrecision}%
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className="bg-clinical-ok/10 text-clinical-ok border-clinical-ok/30">Concluído</Badge>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-6">
                                        {/* Principais Achados */}
                                        <section className="space-y-3">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <AlertCircle className="w-3 h-3" /> Principais Achados
                                            </h4>
                                            <div className="space-y-2">
                                                {analysisResult.findings.map((finding, i) => {
                                                    const matchedDet = analysisResult.detections[i]
                                                    return (
                                                        <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/30 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                                            <div className="space-y-0.5 min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <p className="text-sm font-medium">{finding.type}</p>
                                                                    {matchedDet?.toothNumber && (
                                                                        <Badge variant="outline" className="text-[9px] h-4 px-1 font-normal">
                                                                            Dente {matchedDet.toothNumber}
                                                                        </Badge>
                                                                    )}
                                                                    {matchedDet?.cidCode && (
                                                                        <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono font-normal">
                                                                            {matchedDet.cidCode}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-muted-foreground truncate">{finding.zone}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                                {finding.confidence !== undefined && (
                                                                    <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full border',
                                                                        finding.confidence >= 0.8 ? 'bg-clinical-ok/10 text-clinical-ok border-clinical-ok/20'
                                                                            : finding.confidence >= 0.6 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                                : 'bg-red-400/10 text-red-400 border-red-400/20'
                                                                    )}>
                                                                        {Math.round((finding.confidence as number) * 100)}% conf.
                                                                    </span>
                                                                )}
                                                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full bg-background/50 border border-border/50", finding.color)}>
                                                                    {finding.level}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                                {analysisResult.findings.length === 0 && (
                                                    <p className="text-sm text-muted-foreground italic pl-2">Nenhum achado crítico detectado.</p>
                                                )}
                                            </div>
                                        </section>

                                        {/* Per-Tooth Breakdown */}
                                        {analysisResult.report?.perToothBreakdown && analysisResult.report.perToothBreakdown.length > 0 && (
                                            <section className="space-y-3">
                                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                    <Tag className="w-3 h-3" /> Achados por Dente (Notação FDI)
                                                </h4>
                                                <div className="overflow-x-auto rounded-lg border border-border/30">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="bg-muted/30 border-b border-border/30">
                                                                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Dente</th>
                                                                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Achado</th>
                                                                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">CID-10</th>
                                                                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Severidade</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {analysisResult.report.perToothBreakdown.map((item, i) => (
                                                                <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                                                                    <td className="px-3 py-2 font-bold text-primary">{item.tooth}</td>
                                                                    <td className="px-3 py-2 text-foreground/80">{item.findings}</td>
                                                                    <td className="px-3 py-2 font-mono text-muted-foreground">{item.cidCode || '—'}</td>
                                                                    <td className="px-3 py-2">
                                                                        {item.severity && (
                                                                            <Badge variant="outline" className={cn('text-[9px] h-4 px-1', getSeverityStyle(item.severity).badge)}>
                                                                                {getSeverityStyle(item.severity).ptLabel}
                                                                            </Badge>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </section>
                                        )}

                                        {/* Report Sections */}
                                        {analysisResult.report && (
                                            <>
                                                <section className="space-y-2">
                                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                        <Scan className="w-3 h-3" /> Análise Técnica
                                                    </h4>
                                                    <div className="text-sm text-foreground/80 leading-relaxed bg-muted/10 p-3 rounded-lg border border-border/10">
                                                        {analysisResult.report.technicalAnalysis}
                                                    </div>
                                                </section>

                                                <section className="space-y-2">
                                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                        <Search className="w-3 h-3" /> Achados Detalhados
                                                    </h4>
                                                    <div className="text-sm text-foreground/80 leading-relaxed bg-muted/10 p-3 rounded-lg border border-border/10 whitespace-pre-line">
                                                        {analysisResult.report.detailedFindings}
                                                    </div>
                                                </section>

                                                <section className="space-y-2">
                                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                        <FileText className="w-3 h-3" /> Hipótese Diagnóstica
                                                    </h4>
                                                    <div className="text-sm font-medium text-primary/80 leading-relaxed bg-primary/5 p-3 rounded-lg border border-primary/10">
                                                        {analysisResult.report.diagnosticHypothesis}
                                                    </div>
                                                </section>

                                                {/* Differential Diagnosis */}
                                                {analysisResult.report.differentialDiagnosis && (
                                                    <section className="space-y-2">
                                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                            <GitBranch className="w-3 h-3" /> Diagnóstico Diferencial
                                                        </h4>
                                                        <div className="text-sm text-foreground/80 leading-relaxed bg-muted/10 p-3 rounded-lg border border-border/10 whitespace-pre-line">
                                                            {analysisResult.report.differentialDiagnosis}
                                                        </div>
                                                    </section>
                                                )}

                                            </>
                                        )}

                                        {/* Legacy fallback */}
                                        {!analysisResult.report && analysisResult.clinicalAssessment && (
                                            <section className="space-y-3">
                                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                    <FileText className="w-3 h-3" /> Avaliação Clínica
                                                </h4>
                                                <div className="text-sm text-foreground/80 leading-relaxed bg-muted/20 p-4 rounded-xl border border-border/20">
                                                    {analysisResult.clinicalAssessment}
                                                </div>
                                            </section>
                                        )}
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-rule flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <p className="text-[11px] text-ink-muted">Laudo gerado por análise assistida</p>
                                        <div className="flex flex-wrap items-center gap-2 justify-end">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs gap-1"
                                                onClick={() => {
                                                    if (analysisResult && image) {
                                                        toast.promise(
                                                            (async () => {
                                                                const signer = await fetchVisionPdfSigner()
                                                                await generateVisionPDF({
                                                                    analysisResult,
                                                                    imageBase64: image,
                                                                    refinements,
                                                                    variant: 'laudo',
                                                                    signer,
                                                                })
                                                            })(),
                                                            { loading: 'Gerando PDF do laudo...', success: 'PDF do laudo gerado!', error: 'Erro ao gerar PDF' }
                                                        )
                                                    }
                                                }}
                                            >
                                                <Download className="w-3 h-3" /> PDF do Laudo
                                            </Button>
                                            {isSaved ? (
                                                <>
                                                    {savedArtifactId && (
                                                        <Button
                                                            size="sm"
                                                            variant={isSigned ? 'outline' : 'default'}
                                                            className={cn(
                                                                'h-8 text-xs gap-1',
                                                                isSigned && 'text-clinical-ok border-clinical-ok/30',
                                                            )}
                                                            onClick={() => { void signLaudo() }}
                                                            disabled={isSigning || isSigned}
                                                        >
                                                            {isSigning ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <PenLine className="w-3 h-3" />
                                                            )}
                                                            {isSigned ? 'Assinado' : isSigning ? 'Assinando...' : 'Assinar laudo'}
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-clinical-ok border-clinical-ok/30 hover:bg-clinical-ok/10" onClick={() => router.push('/dashboard/laudos')}>
                                                        <ExternalLink className="w-3 h-3" /> Ver em Laudos
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant={saveFailed ? 'default' : 'ghost'}
                                                    className={cn(
                                                        'h-8 text-xs gap-1',
                                                        saveFailed && 'bg-clinical-alert text-white hover:bg-clinical-alert/90',
                                                    )}
                                                    onClick={saveToLibrary}
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                    {isSaving ? 'Salvando...' : saveFailed ? 'Não salvo — tentar de novo' : 'Salvar laudo'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ─── REFINAMENTOS ─── */}
                                {refinements.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-5 rounded-full bg-primary" />
                                            <h3 className="text-sm font-bold uppercase tracking-wide">
                                                Refinamentos de Região ({refinements.length})
                                            </h3>
                                        </div>

                                        {refinements.map((ref, idx) => (
                                            <div key={idx} className="rounded-xl border border-rule bg-surface-raised overflow-hidden">
                                                <button
                                                    className="w-full p-4 flex items-center gap-4 hover:bg-muted/20 transition-colors text-left"
                                                    onClick={() => setExpandedRefinement(prev => prev === idx ? null : idx)}
                                                >
                                                    {/* Thumbnail */}
                                                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-border/50 bg-black/5 shrink-0">
                                                        <img
                                                            src={ref.regionImageBase64}
                                                            alt="Região refinada"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold">Refinamento #{idx + 1}</p>
                                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                                            {ref.analysis.detections.length} achados • {new Date(ref.analyzedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        {ref.analysis.detections.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                                {ref.analysis.detections.slice(0, 3).map((d, i) => (
                                                                    <Badge key={i} variant="outline" className={cn('text-[9px] h-4 px-1', getSeverityStyle(d.severity).badge)}>
                                                                        {d.label}
                                                                    </Badge>
                                                                ))}
                                                                {ref.analysis.detections.length > 3 && (
                                                                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                                                                        +{ref.analysis.detections.length - 3}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                            onClick={(e) => { e.stopPropagation(); removeRefinement(idx) }}
                                                            title="Remover refinamento"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </Button>
                                                        {expandedRefinement === idx
                                                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                        }
                                                    </div>
                                                </button>

                                                {/* Expanded content */}
                                                <AnimatePresence>
                                                    {expandedRefinement === idx && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-4 pb-4 pt-2 border-t border-border/30 space-y-4">
                                                                {/* Region image with detections */}
                                                                <div className="rounded-lg overflow-hidden border border-border/50 bg-black/5 max-h-48 flex items-center justify-center">
                                                                    <ImageOverlay
                                                                        src={ref.regionImageBase64}
                                                                        detections={ref.analysis.detections}
                                                                        className="max-h-48"
                                                                    />
                                                                </div>

                                                                {/* Refined findings */}
                                                                {ref.analysis.findings.length > 0 && (
                                                                    <div className="space-y-2">
                                                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Achados Refinados</p>
                                                                        {ref.analysis.findings.map((f, i) => {
                                                                            const det = ref.analysis.detections[i]
                                                                            return (
                                                                                <div key={i} className="p-2.5 rounded-lg bg-muted/20 border border-border/20 flex items-center justify-between">
                                                                                    <div>
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <p className="text-xs font-medium">{f.type}</p>
                                                                                            {det?.toothNumber && (
                                                                                                <Badge variant="outline" className="text-[9px] h-4 px-1">
                                                                                                    {det.toothNumber}
                                                                                                </Badge>
                                                                                            )}
                                                                                            {det?.cidCode && (
                                                                                                <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono">
                                                                                                    {det.cidCode}
                                                                                                </Badge>
                                                                                            )}
                                                                                        </div>
                                                                                        <p className="text-[10px] text-muted-foreground mt-0.5">{f.zone}</p>
                                                                                    </div>
                                                                                    <Badge variant="outline" className={cn('text-[9px] h-4 px-1', f.color.replace('text-', 'text-').replace('-500', '-500'))}>
                                                                                        {f.level}
                                                                                    </Badge>
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                )}

                                                                {/* Refined report */}
                                                                {ref.analysis.report?.detailedFindings && (
                                                                    <div>
                                                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Análise Detalhada da Região</p>
                                                                        <p className="text-xs text-foreground/80 leading-relaxed bg-muted/10 p-2.5 rounded-lg border border-border/10 whitespace-pre-line">
                                                                            {ref.analysis.report.detailedFindings}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {ref.analysis.report?.diagnosticHypothesis && (
                                                                    <div>
                                                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Hipótese Diagnóstica</p>
                                                                        <p className="text-xs font-medium text-primary/80 leading-relaxed bg-primary/5 p-2.5 rounded-lg border border-primary/10">
                                                                            {ref.analysis.report.diagnosticHypothesis}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                                </div>
                            </div>
                                </TabsContent>

                                <TabsContent value="conduta" className="mt-0 max-w-3xl w-full self-center space-y-6 outline-none">
                                    <div className="rounded-xl border border-rule bg-surface-raised p-6 flex flex-col">
                                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/30">
                                            <div>
                                                <h2 className="text-xl font-heading font-bold">Conduta recomendada</h2>
                                                <p className="text-xs text-muted-foreground">Orientações clínicas derivadas da análise</p>
                                            </div>
                                            {analysisResult.meta && (
                                                <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                                    {analysisResult.meta.imageType}
                                                </Badge>
                                            )}
                                        </div>

                                        {analysisResult.report?.diagnosticHypothesis && (
                                            <section className="space-y-2 mb-6">
                                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                    <FileText className="w-3 h-3" /> Hipótese Diagnóstica
                                                </h4>
                                                <div className="text-sm font-medium text-primary/80 leading-relaxed bg-primary/5 p-3 rounded-lg border border-primary/10">
                                                    {analysisResult.report.diagnosticHypothesis}
                                                </div>
                                            </section>
                                        )}

                                        {analysisResult.report?.recommendations && analysisResult.report.recommendations.length > 0 ? (
                                            <ul className="space-y-3">
                                                {analysisResult.report.recommendations.map((rec, i) => (
                                                    <li key={i} className="flex gap-3 text-sm items-start p-3 rounded-lg bg-muted/30 border border-border/30">
                                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                                            {i + 1}
                                                        </span>
                                                        <span className="text-foreground leading-relaxed pt-0.5">{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">Nenhuma conduta recomendada foi gerada para esta análise.</p>
                                        )}

                                        <div className="mt-6 pt-4 border-t border-rule flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                            <p className="text-[11px] text-ink-muted">Conduta derivada da análise assistida</p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs gap-1"
                                                disabled={!analysisResult.report?.recommendations?.length}
                                                onClick={() => {
                                                    if (analysisResult && image) {
                                                        toast.promise(
                                                            (async () => {
                                                                const signer = await fetchVisionPdfSigner()
                                                                await generateVisionPDF({
                                                                    analysisResult,
                                                                    imageBase64: image,
                                                                    refinements,
                                                                    variant: 'conduta',
                                                                    signer,
                                                                })
                                                            })(),
                                                            { loading: 'Gerando PDF da conduta...', success: 'PDF da conduta gerado!', error: 'Erro ao gerar PDF' }
                                                        )
                                                    }
                                                }}
                                            >
                                                <Download className="w-3 h-3" /> PDF da Conduta
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Fullscreen Modal */}
            <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
                <DialogContent
                    className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black/95 border-white/10 overflow-hidden [&>button]:text-white [&>button]:hover:bg-white/20"
                    showCloseButton={true}
                >
                    <VisuallyHidden>
                        <DialogTitle>Imagem em tela cheia</DialogTitle>
                    </VisuallyHidden>
                    <div className="relative w-full h-full flex items-center justify-center p-6 pt-12">
                        {image && analysisResult && (
                            <ImageOverlay
                                src={image}
                                detections={analysisResult.detections}
                                className="max-w-full max-h-[85vh]"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Comparison Modal */}
            <Dialog open={isComparing} onOpenChange={setIsComparing}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                        </svg>
                        Comparar Análises
                    </DialogTitle>
                    <div className="space-y-4 mt-4">
                        {previousAnalyses.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">
                                Nenhuma análise anterior encontrada nos laudos salvos.
                            </p>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-sm">Análise Atual</h4>
                                        <div className="p-3 rounded-lg border bg-muted/30">
                                            <p className="text-sm font-medium">{analysisResult?.report?.diagnosticHypothesis?.slice(0, 100) || 'Sem hipótese'}...</p>
                                            <p className="text-xs text-muted-foreground mt-1">{analysisResult?.detections?.length || 0} detecções</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-sm">Selecione uma análise anterior:</h4>
                                        <div className="max-h-60 overflow-auto space-y-2">
                                            {previousAnalyses.map((item) => (
                                                <button
                                                    key={item.id}
                                                    className="w-full p-3 rounded-lg border text-left hover:bg-muted/30 transition-colors"
                                                    onClick={() => {
                                                        setComparisonItems([item.content.analysis, analysisResult as any])
                                                        setIsComparing(false)
                                                    }}
                                                >
                                                    <p className="text-sm font-medium truncate">{item.title}</p>
                                                    <p className="text-xs text-muted-foreground">{item.date}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                {comparisonItems.length > 0 && (
                                    <div className="mt-6 p-4 rounded-lg border">
                                        <h4 className="font-medium mb-3">Comparação Estrutural</h4>
                                        {(() => {
                                            const current = comparisonItems[1]?.detections || []
                                            const previous = comparisonItems[0]?.detections || []
                                            
                                            const currentTeeth = new Set(current.map((d: any) => d.toothNumber).filter(Boolean))
                                            const previousTeeth = new Set(previous.map((d: any) => d.toothNumber).filter(Boolean))
                                            
                                            const newTeeth = [...currentTeeth].filter(t => !previousTeeth.has(t))
                                            const resolvedTeeth = [...previousTeeth].filter(t => !currentTeeth.has(t))
                                            const stableTeeth = [...currentTeeth].filter(t => previousTeeth.has(t))
                                            
                                            return (
                                                <div className="space-y-3 text-sm">
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="p-2 rounded bg-clinical-ok/10 border border-clinical-ok/25">
                                                            <p className="font-medium text-clinical-ok">{newTeeth.length}</p>
                                                            <p className="text-xs text-muted-foreground">Novos achados</p>
                                                        </div>
                                                        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                                                            <p className="font-medium text-amber-600">{stableTeeth.length}</p>
                                                            <p className="text-xs text-muted-foreground">Estáveis</p>
                                                        </div>
                                                        <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                                                            <p className="font-medium text-blue-600">{resolvedTeeth.length}</p>
                                                            <p className="text-xs text-muted-foreground">Resolvidos</p>
                                                        </div>
                                                    </div>
                                                    {newTeeth.length > 0 && (
                                                        <p className="text-xs"><span className="font-medium text-clinical-ok">Novos:</span> Regiões {newTeeth.join(', ')}</p>
                                                    )}
                                                    {resolvedTeeth.length > 0 && (
                                                        <p className="text-xs"><span className="font-medium text-blue-600">Resolvidos:</span> Regiões {resolvedTeeth.join(', ')}</p>
                                                    )}
                                                </div>
                                            )
                                        })()}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Scroll moderno: usar classes CSS de app/globals.css */}
        </div>
    )
}
