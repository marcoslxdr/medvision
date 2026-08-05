'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import {
  FileText,
  List,
  Sparkles,
  Layers,
  BookOpen,
  ChevronRight
} from 'lucide-react'

interface SummaryPreviewProps {
  topic: string
  depth: 'basico' | 'intermediario' | 'avancado'
  format: 'resumo' | 'topicos' | 'esquema'
}

export function SummaryPreview({ topic, depth, format }: SummaryPreviewProps) {
  const depthLabels = {
    basico: { sections: 3, label: 'Visao Geral' },
    intermediario: { sections: 5, label: 'Detalhado' },
    avancado: { sections: 7, label: 'Aprofundado' }
  }

  const formatIcons = {
    resumo: FileText,
    topicos: List,
    esquema: Layers
  }

  const FormatIcon = formatIcons[format]
  const config = depthLabels[depth]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="relative"
    >
      {/* Glass Card Container */}
      <div className="glass-card rounded-2xl p-6 border border-border/20 bg-card/50 backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/20">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <FormatIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground/90">
              {topic || 'Seu Resumo'}
            </h4>
            <p className="text-xs text-muted-foreground">
              {config.label} • {config.sections} secoes
            </p>
          </div>
        </div>

        {/* Animated Sections Preview */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {Array.from({ length: config.sections }).map((_, i) => (
              <motion.div
                key={`section-${depth}-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{
                  delay: i * 0.08,
                  type: 'spring',
                  stiffness: 260,
                  damping: 20
                }}
                className="flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-primary/60" />
                <div
                  className="h-3 rounded-full bg-muted/50"
                  style={{ width: `${60 + (i % 3) * 10}%` }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Decorative Glow */}
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
      </div>
    </motion.div>
  )
}

interface FlashcardPreviewProps {
  topic: string
  quantity: number
  difficulty: 'facil' | 'medio' | 'dificil'
}

export function FlashcardPreview({ topic, quantity, difficulty }: FlashcardPreviewProps) {
  const [flippedCard, setFlippedCard] = React.useState<number | null>(null)

  const difficultyColors = {
    facil: 'bg-green-500/20 border-green-500/30 text-green-400',
    medio: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
    dificil: 'bg-red-500/20 border-red-500/30 text-red-400'
  }

  // Show max 4 preview cards
  const previewCount = Math.min(quantity, 4)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="relative"
    >
      <div className="glass-card rounded-2xl p-6 border border-border/20 bg-card/50 backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <BookOpen className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground/90">
                {topic || 'Seu Deck'}
              </h4>
              <p className="text-xs text-muted-foreground">
                {quantity} flashcards
              </p>
            </div>
          </div>
          <span className={cn(
            'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
            difficultyColors[difficulty]
          )}>
            {difficulty}
          </span>
        </div>

        {/* Animated Flashcard Stack */}
        <div className="relative h-40 flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            {Array.from({ length: previewCount }).map((_, i) => {
              const isFlipped = flippedCard === i
              const offset = (previewCount - 1 - i) * 8
              const rotation = (previewCount - 1 - i) * 2

              return (
                <motion.div
                  key={`card-${quantity}-${difficulty}-${i}`}
                  initial={{ opacity: 0, y: 30, rotateX: -15 }}
                  animate={{
                    opacity: 1,
                    y: offset,
                    x: offset / 2,
                    rotate: rotation,
                    rotateY: isFlipped ? 180 : 0
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    delay: i * 0.1,
                    type: 'spring',
                    stiffness: 260,
                    damping: 20
                  }}
                  onClick={() => setFlippedCard(isFlipped ? null : i)}
                  className={cn(
                    'absolute w-48 h-28 rounded-xl border cursor-pointer',
                    'bg-gradient-to-br from-card to-card/80',
                    'border-border/30 shadow-lg',
                    'flex items-center justify-center p-4',
                    'hover:border-primary/40 transition-colors',
                    i === previewCount - 1 && 'hover:scale-105'
                  )}
                  style={{
                    transformStyle: 'preserve-3d',
                    zIndex: i
                  }}
                >
                  {/* Front */}
                  <div
                    className={cn(
                      'absolute inset-0 flex flex-col items-center justify-center p-4 backface-hidden rounded-xl',
                      isFlipped && 'invisible'
                    )}
                  >
                    <Sparkles className="w-4 h-4 text-primary/60 mb-2" />
                    <div className="h-2 w-20 rounded-full bg-muted/50" />
                    <div className="h-2 w-16 rounded-full bg-muted/30 mt-2" />
                  </div>

                  {/* Back */}
                  <div
                    className={cn(
                      'absolute inset-0 flex flex-col items-center justify-center p-4 backface-hidden rounded-xl',
                      'rotate-y-180 bg-primary/5',
                      !isFlipped && 'invisible'
                    )}
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    <ChevronRight className="w-4 h-4 text-primary/60 mb-2" />
                    <div className="h-2 w-24 rounded-full bg-primary/20" />
                    <div className="h-2 w-20 rounded-full bg-primary/10 mt-2" />
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Quantity indicator */}
        {quantity > 4 && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            +{quantity - 4} cards adicionais
          </p>
        )}

        {/* Decorative Glow */}
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full pointer-events-none" />
      </div>
    </motion.div>
  )
}
