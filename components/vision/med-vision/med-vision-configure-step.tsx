'use client'

import { motion, AnimatePresence } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MedVisionStepIndicator } from '@/components/vision/med-vision/step-indicator'
import { MedVisionConfigForm } from '@/components/vision/med-vision/med-vision-config-form'
import { MedVisionUploadStep, type UploadFile } from '@/components/vision/med-vision/med-vision-upload-step'
import { VisionClinicalDisclaimer } from '@/components/vision/med-vision/clinical-disclaimer'
import type { MedVisionAnalysisConfig } from '@/lib/types/vision-analysis-request'
import type { ImageQualityResult } from '@/lib/utils/image-quality-validator'
import type { VisionState } from '@/components/vision/med-vision/vision-wizard-state'

type MedVisionConfigureStepProps = {
    state: VisionState
    originalImage: string | null
    config: MedVisionAnalysisConfig
    onConfigChange: (patch: Partial<MedVisionAnalysisConfig>) => void
    qualityResult: ImageQualityResult | null
    /** @deprecated Usado pelo upload antigo. Mantido para compatibilidade. */
    getRootProps?: () => Record<string, unknown>
    /** @deprecated Usado pelo upload antigo. Mantido para compatibilidade. */
    getInputProps?: () => Record<string, unknown>
    /** @deprecated Usado pelo upload antigo. Mantido para compatibilidade. */
    isDragActive?: boolean
    /** Callback quando imagem é aceita (novo upload via MedVisionUploadStep). */
    onImageAccepted?: (files: UploadFile[]) => void
    onBack: () => void
    onContinue: () => void
}

const PANEL = 'rounded-xl border border-rule bg-surface-raised'

export function MedVisionConfigureStep({
    state,
    originalImage,
    config,
    onConfigChange,
    qualityResult,
    getRootProps: _getRootProps,
    getInputProps: _getInputProps,
    isDragActive: _isDragActive,
    onImageAccepted,
    onBack,
    onContinue,
}: MedVisionConfigureStepProps) {
    return (
        <motion.div
            key="configure"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="w-full space-y-6"
        >
            <MedVisionStepIndicator state={state} />

            {!originalImage ? (
                <AnimatePresence mode="wait">
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="space-y-4"
                    >
                        <MedVisionUploadStep
                            onImagesAccepted={onImageAccepted || (() => {})}
                            description="Radiografia, tomografia, vídeo TC (MP4) ou foto clínica"
                            maxSizeMB={10}
                            maxFiles={1}
                        />
                        <VisionClinicalDisclaimer variant="compact" />
                    </motion.div>
                </AnimatePresence>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className={cn(PANEL, 'p-4')}>
                        <p className="text-xs text-ink-muted mb-3 font-medium">Imagem selecionada</p>
                        <div className="rounded-lg overflow-hidden border border-rule bg-surface">
                            <img
                                src={originalImage}
                                alt="Preview"
                                className="w-full object-contain max-h-[300px]"
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-3 w-full text-xs text-ink-muted"
                            onClick={onBack}
                        >
                            Trocar imagem
                        </Button>
                    </div>
                    <MedVisionConfigForm
                        config={config}
                        onChange={onConfigChange}
                        qualityWarnings={qualityResult?.warnings}
                    />
                </div>
            )}

            {originalImage && (
                <>
                    <VisionClinicalDisclaimer variant="compact" />
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1 h-11 rounded-xl gap-2 border-rule" onClick={onBack}>
                            <ChevronRight className="w-4 h-4 rotate-180" /> Voltar
                        </Button>
                        <Button className="flex-1 h-11 rounded-xl gap-2 bg-signal text-surface-raised hover:bg-signal/90" onClick={onContinue}>
                            Revisar análise <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </>
            )}
        </motion.div>
    )
}
