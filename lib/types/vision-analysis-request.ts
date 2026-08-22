import { z } from 'zod'

import {
  VISION_MODALITY_IDS,
  VISION_PATIENT_SEX_VALUES,
  VISION_REPORT_DEPTH_IDS,
} from '@/lib/constants/vision-analysis-options'
import type {
  VisionModality,
  VisionPatientSex,
  VisionReportDepth,
  VisionReportSections,
} from '@/lib/constants/vision-analysis-options'
import { VISION_SPECIALTY_ORDER } from '@/lib/constants/vision-specialties'
import type { VisionSpecialty } from '@/lib/constants/vision-specialties/types'

const specialtyEnumOrder = VISION_SPECIALTY_ORDER as unknown as readonly [
  VisionSpecialty,
  ...VisionSpecialty[],
]

const specialtyEnum = z.enum(specialtyEnumOrder)

const visionModalityEnum = z.enum(
  VISION_MODALITY_IDS as unknown as [VisionModality, ...VisionModality[]],
)

const visionReportDepthEnum = z.enum(
  VISION_REPORT_DEPTH_IDS as unknown as [VisionReportDepth, ...VisionReportDepth[]],
)

const visionPatientSexEnum = z.enum(
  VISION_PATIENT_SEX_VALUES as unknown as [
    VisionPatientSex,
    ...VisionPatientSex[],
  ],
)

export const visionAnalysisRequestSchema = z.object({
  /** Imagem única (data URL ou base64). Obrigatória se `images` não for enviado. */
  image: z.string().min(32).optional(),
  /** Série multi-corte / frames de vídeo TC (data URLs). Máx. 12. */
  images: z.array(z.string().min(32)).min(1).max(12).optional(),
  /** Origem do upload */
  sourceType: z.enum(['image', 'video', 'dicom']).optional(),
  videoMeta: z
    .object({
      durationSec: z.number().positive().max(600).optional(),
      frameCount: z.number().int().positive().max(12).optional(),
      sourceName: z.string().max(240).optional(),
      timestampsSec: z.array(z.number().min(0)).max(12).optional(),
    })
    .optional(),
  specialty: specialtyEnum.optional(),
  clinicalContext: z.string().max(500).optional(),
  modality: visionModalityEnum.optional(),
  reportDepth: visionReportDepthEnum.optional(),
  focusTags: z.array(z.string().min(1).max(80)).max(12).optional(),
  patientAge: z.number().int().min(0).max(120).optional(),
  patientSex: visionPatientSexEnum.optional(),
  reportSections: z
    .object({
      findings: z.boolean(),
      impression: z.boolean(),
      recommendations: z.boolean(),
      comparison: z.boolean(),
    })
    .optional(),
  mode: z.enum(['refine', 'quick', 'preview', 'detailed']).optional(),
  originalAnalysisSummary: z.string().optional(),
}).superRefine((val, ctx) => {
  const hasImage = Boolean(val.image && val.image.length >= 32)
  const hasImages = Boolean(val.images && val.images.length > 0)
  if (!hasImage && !hasImages) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Envie image ou images[]',
      path: ['image'],
    })
  }
})

export type VisionAnalysisRequest = z.infer<typeof visionAnalysisRequestSchema>

export type MedVisionAnalysisConfig = {
  specialty: VisionSpecialty
  clinicalContext: string
  modality: VisionModality
  reportDepth: VisionReportDepth
  focusTags: string[]
  patientAge?: number
  patientSex?: VisionPatientSex
  reportSections: VisionReportSections
  /** ID interno do paciente (agrupamento em Laudos; não é PHI). */
  patientKey?: string
}
