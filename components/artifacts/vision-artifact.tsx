'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Download,
  Expand,
  X,
  Copy,
  Check,
  Scan,
  Search,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Maximize2,
  Printer,
  Tag,
  GitBranch,
  Microscope,
} from 'lucide-react'
import type { VisionArtifact as VisionArtifactType } from './types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { toast } from 'sonner'

interface VisionArtifactProps {
  artifact: VisionArtifactType
  className?: string
}

export function VisionArtifact({ artifact, className }: VisionArtifactProps) {
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isImageExpanded, setIsImageExpanded] = useState(false)
  const [expandedRefinement, setExpandedRefinement] = useState<number | null>(null)

  const { analysis, imageBase64, imageUrl, thumbnailBase64, analyzedAt, refinements = [] } = artifact
  const fullImageSrc = imageUrl || imageBase64 || thumbnailBase64 || ''

  const [reportId] = useState(() => artifact.id?.slice(0, 8).toUpperCase() || Math.random().toString(36).slice(2, 8).toUpperCase())
  const formattedDate = new Date(analyzedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const copyContent = async () => {
    let content = `# LAUDO ODONTOVISION - ID: #${reportId}\n`
    content += `Data: ${formattedDate}\n\n`

    if (analysis.meta?.imageType) {
      content += `**Tipo de Imagem:** ${analysis.meta.imageType}\n`
      content += `**Qualidade:** ${analysis.meta.quality}\n\n`
    }

    if (analysis.findings && analysis.findings.length > 0) {
      content += '## Principais Achados\n\n'
      analysis.findings.forEach((finding, idx) => {
        const det = analysis.detections?.[idx]
        let findingText = `- **${finding.type}** - ${finding.zone} (${finding.level})`
        if (det?.toothNumber) findingText += ` [Dente ${det.toothNumber}]`
        if (det?.cidCode) findingText += ` [CID-10: ${det.cidCode}]`
        content += findingText + '\n'
      })
      content += '\n'
    }

    if (analysis.report?.perToothBreakdown && analysis.report.perToothBreakdown.length > 0) {
      content += '## Achados por Dente (Notação FDI)\n\n'
      content += '| Dente | Achado | CID-10 | Severidade |\n'
      content += '|-------|---------|--------|------------|\n'
      analysis.report.perToothBreakdown.forEach((item) => {
        content += `| ${item.tooth} | ${item.findings} | ${item.cidCode || '—'} | ${item.severity || 'N/A'} |\n`
      })
      content += '\n'
    }

    if (analysis.report?.technicalAnalysis) {
      content += '## Análise Técnica\n\n'
      content += analysis.report.technicalAnalysis + '\n\n'
    }

    if (analysis.report?.detailedFindings) {
      content += '## Achados Detalhados\n\n'
      content += analysis.report.detailedFindings + '\n\n'
    }

    if (analysis.report?.diagnosticHypothesis) {
      content += '## Hipótese Diagnóstica\n\n'
      content += analysis.report.diagnosticHypothesis + '\n\n'
    }

    if (analysis.report?.differentialDiagnosis) {
      content += '## Diagnóstico Diferencial\n\n'
      content += analysis.report.differentialDiagnosis + '\n\n'
    }

    if (analysis.report?.recommendations && analysis.report.recommendations.length > 0) {
      content += '## Conduta Recomendada\n\n'
      analysis.report.recommendations.forEach((rec, i) => {
        content += `${i + 1}. ${rec}\n`
      })
    }

    if (refinements.length > 0) {
      content += '\n## Refinamentos de Região\n\n'
      refinements.forEach((ref, idx) => {
        content += `### Refinamento #${idx + 1}\n`
        content += `Data: ${new Date(ref.analyzedAt).toLocaleString('pt-BR')}\n`
        if (ref.analysis.detections && ref.analysis.detections.length > 0) {
          content += 'Achados:\n'
          ref.analysis.detections.forEach((det, dIdx) => {
            let text = `  ${dIdx + 1}. ${det.label}`
            if (det.toothNumber) text += ` (Dente ${det.toothNumber})`
            if (det.cidCode) text += ` - ${det.cidCode}`
            content += text + '\n'
          })
        }
        if (ref.analysis.report?.diagnosticHypothesis) {
          content += `Hipótese: ${ref.analysis.report.diagnosticHypothesis}\n`
        }
        content += '\n'
      })
    }

    content += '\n---\n'
    content += '*Este laudo foi gerado por IA e serve apenas como auxílio diagnóstico.*\n'
    content += '*MedVision AI • CRM Virtual: 0001-AI*'

    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Laudo copiado para área de transferência')
  }

  const downloadImage = () => {
    if (!fullImageSrc) return
    const a = document.createElement('a')
    a.href = fullImageSrc
    a.download = `radiografia-${reportId}.jpg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const getSeverityColor = (level: string) => {
    const lowerLevel = level.toLowerCase()
    if (lowerLevel.includes('crít') || lowerLevel.includes('alto') || lowerLevel.includes('grave')) {
      return 'text-red-500 bg-red-500/10 border-red-500/30'
    }
    if (lowerLevel.includes('moder') || lowerLevel.includes('méd')) {
      return 'text-amber-500 bg-amber-500/10 border-amber-500/30'
    }
    return 'text-green-500 bg-green-500/10 border-green-500/30'
  }

  const getQualityBadgeColor = (quality?: string) => {
    if (!quality) return 'bg-muted text-muted-foreground'
    const lowerQuality = quality.toLowerCase()
    if (lowerQuality.includes('excelente') || lowerQuality.includes('boa')) {
      return 'bg-green-500/10 text-green-500 border-green-500/30'
    }
    if (lowerQuality.includes('aceitável') || lowerQuality.includes('adequa')) {
      return 'bg-amber-500/10 text-amber-500 border-amber-500/30'
    }
    return 'bg-red-500/10 text-red-500 border-red-500/30'
  }

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30'
      case 'moderate': return 'text-amber-500 bg-amber-500/10 border-amber-500/30'
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/30'
    }
  }

  const getSeverityLabel = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'Crítico'
      case 'moderate': return 'Moderado'
      default: return 'Normal'
    }
  }

  return (
    <>
      <div
        className={cn(
          'rounded-xl border border-border bg-card overflow-hidden',
          'shadow-sm hover:shadow-md transition-shadow',
          className
        )}
      >
        {/* Header - Style like PDF */}
        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">ODONTO GPT</h2>
              <p className="text-sm text-white/80">Laudo de Análise por Inteligência Artificial</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">ID: #{reportId}</p>
              <p className="text-white/70">{formattedDate}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2">
            {analysis.meta?.imageType && (
              <Badge variant="outline" className="text-xs">
                {analysis.meta.imageType}
              </Badge>
            )}
            {analysis.meta?.quality && (
              <Badge variant="outline" className={cn('text-xs', getQualityBadgeColor(analysis.meta.quality))}>
                {analysis.meta.quality}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={copyContent} title="Copiar laudo">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} title="Expandir">
              <Expand className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Image Section */}
        <div className="relative border-b border-border">
          <div
            className="relative aspect-video bg-black/5 cursor-pointer group"
            onClick={() => setIsImageExpanded(true)}
          >
            <img
              src={fullImageSrc}
              alt="Imagem radiográfica"
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="bg-white/90 rounded-full p-2">
                <Maximize2 className="h-5 w-5 text-gray-800" />
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="absolute bottom-3 right-3 h-8 text-xs gap-1 bg-black/60 hover:bg-black/80 text-white border-0"
            onClick={(e) => {
              e.stopPropagation()
              downloadImage()
            }}
          >
            <Download className="h-3 w-3" /> Baixar
          </Button>
        </div>

        {/* Findings Section */}
        {analysis.findings && analysis.findings.length > 0 && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                Principais Achados
              </h3>
            </div>
            <div className="space-y-2">
              {analysis.findings.map((finding, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{finding.type}</p>
                    <p className="text-xs text-muted-foreground">{finding.zone}</p>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px]', getSeverityColor(finding.level))}>
                    {finding.level}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Analysis */}
        {analysis.report?.technicalAnalysis && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-primary" />
              <Scan className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                Análise Técnica
              </h3>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed bg-muted/20 p-3 rounded-lg border border-border/30">
              {analysis.report.technicalAnalysis}
            </p>
          </div>
        )}

        {/* Detailed Findings */}
        {analysis.report?.detailedFindings && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-primary" />
              <Search className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                Achados Detalhados
              </h3>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line bg-muted/20 p-3 rounded-lg border border-border/30">
              {analysis.report.detailedFindings}
            </p>
          </div>
        )}

        {/* Diagnostic Hypothesis */}
        {analysis.report?.diagnosticHypothesis && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-primary" />
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                Hipótese Diagnóstica
              </h3>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm font-medium text-primary leading-relaxed">
                {analysis.report.diagnosticHypothesis}
              </p>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.report?.recommendations && analysis.report.recommendations.length > 0 && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-primary" />
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                Conduta Recomendada
              </h3>
            </div>
            <ul className="space-y-2">
              {analysis.report.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                  <span className="text-foreground/90">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Per-Tooth Breakdown */}
        {analysis.report?.perToothBreakdown && analysis.report.perToothBreakdown.length > 0 && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-primary" />
              <Tag className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                Achados por Dente (Notação FDI)
              </h3>
            </div>
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
                  {analysis.report.perToothBreakdown.map((item, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="px-3 py-2 font-bold text-primary">{item.tooth}</td>
                      <td className="px-3 py-2 text-foreground/80">{item.findings}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{item.cidCode || '—'}</td>
                      <td className="px-3 py-2">
                        {item.severity && (
                          <Badge variant="outline" className={cn('text-[9px] h-4 px-1', getSeverityBadge(item.severity))}>
                            {getSeverityLabel(item.severity)}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Differential Diagnosis (report level) */}
        {analysis.report?.differentialDiagnosis && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-primary" />
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                Diagnóstico Diferencial
              </h3>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed bg-muted/20 p-3 rounded-lg border border-border/30 whitespace-pre-line">
              {analysis.report.differentialDiagnosis}
            </p>
          </div>
        )}

        {/* Refinements */}
        {refinements.length > 0 && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-primary" />
              <Microscope className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                Refinamentos de Região ({refinements.length})
              </h3>
            </div>
            <div className="space-y-2">
              {refinements.map((ref, idx) => (
                <div key={idx} className="rounded-lg border border-border/30 overflow-hidden">
                  <button
                    className="w-full p-3 flex items-center gap-3 hover:bg-muted/20 transition-colors text-left"
                    onClick={() => setExpandedRefinement(prev => prev === idx ? null : idx)}
                  >
                    <div className="w-12 h-12 rounded overflow-hidden border border-border/50 bg-black/5 shrink-0">
                      <img
                        src={ref.regionImageBase64}
                        alt="Região refinada"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">Refinamento #{idx + 1}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {ref.analysis.detections?.length || 0} achados • {new Date(ref.analyzedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    {expandedRefinement === idx
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                  </button>
                  {expandedRefinement === idx && ref.analysis.detections && ref.analysis.detections.length > 0 && (
                    <div className="px-3 pb-3 border-t border-border/30 space-y-2 pt-2">
                      {ref.analysis.detections.map((det, dIdx) => (
                        <div key={dIdx} className="p-2 rounded bg-muted/20 border border-border/20 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-medium">{det.label}</p>
                            {det.toothNumber && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1">
                                Dente {det.toothNumber}
                              </Badge>
                            )}
                            {det.cidCode && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono">
                                {det.cidCode}
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className={cn('text-[9px] h-4 px-1', getSeverityBadge(det.severity))}>
                            {getSeverityLabel(det.severity)}
                          </Badge>
                        </div>
                      ))}
                      {ref.analysis.report?.diagnosticHypothesis && (
                        <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/20">
                          <p className="text-[10px] font-semibold text-muted-foreground mb-1">Hipótese Diagnóstica</p>
                          <p className="text-xs text-primary/80">{ref.analysis.report.diagnosticHypothesis}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legacy Clinical Assessment */}
        {!analysis.report && analysis.clinicalAssessment && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-primary" />
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                Avaliação Clínica
              </h3>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed bg-muted/20 p-3 rounded-lg">
              {analysis.clinicalAssessment}
            </p>
          </div>
        )}

        {/* Footer / Signature */}
        <div className="px-4 py-3 bg-muted/20 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://ui-avatars.com/api/?name=IA&background=0284c7&color=fff"
                className="w-8 h-8 rounded-full border border-primary/20"
                alt="IA signature"
              />
              <div>
                <p className="text-xs font-bold text-foreground">MedVision AI</p>
                <p className="text-[10px] text-muted-foreground">CRM Virtual: 0001-AI</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic max-w-xs text-right">
              Este laudo foi gerado por IA e serve apenas como auxílio diagnóstico.
            </p>
          </div>
        </div>
      </div>

      {/* Full Image Modal */}
      <Dialog open={isImageExpanded} onOpenChange={setIsImageExpanded}>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black/95 border-white/10 overflow-hidden [&>button]:text-white [&>button]:hover:bg-white/20"
          showCloseButton={true}
        >
          <VisuallyHidden>
            <DialogTitle>Imagem em tela cheia</DialogTitle>
          </VisuallyHidden>
          <div className="relative w-full h-full flex items-center justify-center p-6 pt-12">
            <img
              src={fullImageSrc}
              alt="Imagem radiográfica em tela cheia"
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
