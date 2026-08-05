'use client'

import { useRef, useEffect, useState } from "react"
import { motion, useInView, useScroll, useTransform, useSpring, useAnimation } from "framer-motion"

// Hook para animações baseadas em scroll
export function useScrollAnimation(threshold = 0.3) {
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once: false, amount: threshold })

    return { ref, isInView }
}

// Hook para parallax
export function useParallax(value: any, distance: number) {
    return useTransform(value, [0, 1], [-distance, distance])
}

// Componente de seção com animação de entrada
interface ScrollRevealProps {
    children: React.ReactNode
    className?: string
    delay?: number
    direction?: 'up' | 'down' | 'left' | 'right'
}

export function ScrollReveal({ children, className = "", delay = 0, direction = 'up' }: ScrollRevealProps) {
    const { ref, isInView } = useScrollAnimation(0.2)

    const variants = {
        hidden: {
            opacity: 0,
            y: direction === 'up' ? 50 : direction === 'down' ? -50 : 0,
            x: direction === 'left' ? 50 : direction === 'right' ? -50 : 0,
        },
        visible: {
            opacity: 1,
            y: 0,
            x: 0,
        }
    }

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={variants}
            transition={{
                duration: 0.8,
                delay,
                ease: [0.25, 0.1, 0.25, 1]
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

// Componente de texto digitado
interface TypewriterProps {
    text: string
    delay?: number
    speed?: number
    className?: string
    onComplete?: () => void
}

export function Typewriter({ text, delay = 0, speed = 50, className = "", onComplete }: TypewriterProps) {
    const [displayText, setDisplayText] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const { ref, isInView } = useScrollAnimation(0.5)

    useEffect(() => {
        if (!isInView) {
            setDisplayText("")
            setIsTyping(false)
            return
        }

        setIsTyping(true)
        let i = 0
        const timer = setTimeout(() => {
            const interval = setInterval(() => {
                if (i < text.length) {
                    setDisplayText(text.slice(0, i + 1))
                    i++
                } else {
                    clearInterval(interval)
                    setIsTyping(false)
                    onComplete?.()
                }
            }, speed)
            return () => clearInterval(interval)
        }, delay)

        return () => clearTimeout(timer)
    }, [isInView, text, delay, speed, onComplete])

    return (
        <span ref={ref} className={className}>
            {displayText}
            {isTyping && <span className="animate-pulse">|</span>}
        </span>
    )
}

// Componente de progresso de scroll
interface ScrollProgressProps {
    className?: string
}

export function ScrollProgress({ className = "" }: ScrollProgressProps) {
    const { scrollYProgress } = useScroll()
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })

    return (
        <motion.div
            style={{ scaleX }}
            className={`fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 origin-left z-50 ${className}`}
        />
    )
}

// Componente de ícone flutuante animado
interface FloatingIconProps {
    icon: React.ComponentType<{ className?: string }>
    color: string
    size?: 'sm' | 'md' | 'lg'
    delay?: number
    className?: string
}

export function FloatingIcon({ icon: Icon, color, size = 'md', delay = 0, className = "" }: FloatingIconProps) {
    const sizes = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16'
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{
                opacity: 1,
                scale: 1,
                // Animação com amplitude fixa para evitar hydration mismatch
                y: [0, -8, 0]
            }}
            transition={{
                opacity: { delay, duration: 0.5 },
                scale: { delay, duration: 0.5, type: "spring" },
                y: { delay: delay + 0.5, duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
            className={className}
            style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
        >
            <div className={`${sizes[size]} p-2 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
                <Icon className="w-full h-full text-white" />
            </div>
        </motion.div>
    )
}

// Animação de scanner para imagens
interface ImageScannerProps {
    children: React.ReactNode
    className?: string
    scanColor?: string
}

export function ImageScanner({ children, className = "", scanColor = "cyan" }: ImageScannerProps) {
    const { ref, isInView } = useScrollAnimation(0.5)
    const [isScanning, setIsScanning] = useState(false)
    const [prevInView, setPrevInView] = useState(isInView)

    // Ajusta o estado durante o render quando isInView muda (padrão React)
    if (prevInView !== isInView) {
        setPrevInView(isInView)
        if (isInView) {
            setIsScanning(true)
        }
    }

    useEffect(() => {
        if (isInView) {
            const timer = setTimeout(() => setIsScanning(false), 2000)
            return () => clearTimeout(timer)
        }
    }, [isInView])

    return (
        <div ref={ref} className={`relative overflow-hidden ${className}`}>
            {children}
            {isScanning && (
                <motion.div
                    initial={{ top: 0 }}
                    animate={{ top: "100%" }}
                    transition={{ duration: 2, ease: "linear" }}
                    className={`absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-${scanColor}-400 to-transparent shadow-lg`}
                    style={{ boxShadow: `0 0 20px var(--${scanColor}-400)` }}
                />
            )}
        </div>
    )
}

// Componente de dados voando
interface FlyingDataProps {
    items: string[]
    delay?: number
    className?: string
}

export function FlyingData({ items, delay = 0, className = "" }: FlyingDataProps) {
    const { ref, isInView } = useScrollAnimation(0.3)

    return (
        <div ref={ref} className={`relative h-32 overflow-hidden ${className}`}>
            {isInView && items.map((item, i) => (
                <motion.div
                    key={i}
                    initial={{ x: -100, opacity: 0, rotate: -10 }}
                    animate={{ x: 300, opacity: [0, 1, 1, 0], rotate: 0 }}
                    transition={{
                        delay: delay + i * 0.3,
                        duration: 1.5,
                        ease: "easeOut"
                    }}
                    className="absolute top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-500/20 border border-blue-500/40 rounded-lg text-sm text-blue-300"
                >
                    📄 {item}
                </motion.div>
            ))}
        </div>
    )
}

// Componente de código/terminal animado
interface AnimatedTerminalProps {
    lines: { type: 'input' | 'output', text: string }[]
    className?: string
}

export function AnimatedTerminal({ lines, className = "" }: AnimatedTerminalProps) {
    const { ref, isInView } = useScrollAnimation(0.3)
    const [visibleLines, setVisibleLines] = useState<number>(0)
    const [prevInView, setPrevInView] = useState(isInView)

    // Ajusta o estado durante o render quando isInView muda (padrão React)
    if (prevInView !== isInView) {
        setPrevInView(isInView)
        if (!isInView) {
            setVisibleLines(0)
        }
    }

    useEffect(() => {
        if (!isInView) {
            return
        }

        const interval = setInterval(() => {
            setVisibleLines(prev => {
                if (prev >= lines.length) {
                    clearInterval(interval)
                    return prev
                }
                return prev + 1
            })
        }, 800)

        return () => clearInterval(interval)
    }, [isInView, lines.length])

    return (
        <div ref={ref} className={`bg-slate-900 rounded-xl p-4 font-mono text-sm ${className}`}>
            <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="space-y-2">
                {lines.slice(0, visibleLines).map((line, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={line.type === 'input' ? 'text-green-400' : 'text-slate-300'}
                    >
                        {line.type === 'input' && <span className="text-cyan-400">→ </span>}
                        {line.text}
                    </motion.div>
                ))}
                {visibleLines < lines.length && (
                    <span className="text-cyan-400 animate-pulse">▌</span>
                )}
            </div>
        </div>
    )
}

// Componente de card aparecendo sequencialmente
interface SequentialCardsProps {
    cards: { title: string; content: string; color: string }[]
    className?: string
}

export function SequentialCards({ cards, className = "" }: SequentialCardsProps) {
    const { ref, isInView } = useScrollAnimation(0.3)

    return (
        <div ref={ref} className={`flex flex-wrap gap-4 ${className}`}>
            {cards.map((card, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                    transition={{ delay: i * 0.2, duration: 0.5, type: "spring" }}
                    className={`p-4 rounded-xl border ${card.color} backdrop-blur-sm`}
                >
                    <h4 className="font-bold mb-1">{card.title}</h4>
                    <p className="text-sm text-muted-foreground">{card.content}</p>
                </motion.div>
            ))}
        </div>
    )
}

// Componente de gráfico animado
interface AnimatedChartProps {
    values: number[]
    labels: string[]
    className?: string
}

export function AnimatedChart({ values, labels, className = "" }: AnimatedChartProps) {
    const { ref, isInView } = useScrollAnimation(0.5)
    const maxValue = Math.max(...values)

    return (
        <div ref={ref} className={`flex items-end gap-2 h-40 ${className}`}>
            {values.map((value, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                    <motion.div
                        initial={{ height: 0 }}
                        animate={isInView ? { height: `${(value / maxValue) * 100}%` } : {}}
                        transition={{ delay: i * 0.1, duration: 0.8, type: "spring" }}
                        className="w-8 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t-lg"
                    />
                    <span className="text-xs text-muted-foreground">{labels[i]}</span>
                </div>
            ))}
        </div>
    )
}

// Componente de mapa mental expandindo
interface MindMapNodeProps {
    label: string
    children?: React.ReactNode
    delay?: number
    isRoot?: boolean
}

export function MindMapNode({ label, children, delay = 0, isRoot = false }: MindMapNodeProps) {
    const { ref, isInView } = useScrollAnimation(0.3)

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay, duration: 0.5, type: "spring" }}
            className="flex flex-col items-center"
        >
            <div className={`px-4 py-2 rounded-xl ${isRoot ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {label}
            </div>
            {children && (
                <div className="flex gap-8 mt-4 pt-4 border-t border-dashed border-slate-300 dark:border-slate-700">
                    {children}
                </div>
            )}
        </motion.div>
    )
}
