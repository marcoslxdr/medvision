'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { VisionAnnotation, AnnotationTool, AnnotationColor } from '@/lib/types/vision'

interface AnnotationCanvasProps {
    width: number
    height: number
    annotations: VisionAnnotation[]
    currentAnnotation: Partial<VisionAnnotation> | null
    activeTool: AnnotationTool
    activeColor: AnnotationColor
    isDrawing: boolean
    onStartDrawing: (point: { x: number; y: number }) => void
    onDraw: (point: { x: number; y: number }) => void
    onEndDrawing: (text?: string) => void
    onCancelDrawing: () => void
}

const colorMap: Record<AnnotationColor, string> = {
    red: '#ef4444',
    yellow: '#eab308',
    blue: '#3b82f6',
    white: '#ffffff'
}

export function AnnotationCanvas({
    width,
    height,
    annotations,
    currentAnnotation,
    activeTool,
    activeColor,
    isDrawing,
    onStartDrawing,
    onDraw,
    onEndDrawing,
    onCancelDrawing
}: AnnotationCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isMouseDown, setIsMouseDown] = useState(false)
    const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false })
    const textInputRef = useRef<HTMLInputElement>(null)

    // Get color from annotation
    const getColor = (color: AnnotationColor): string => colorMap[color]

    // Draw a single annotation
    const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: VisionAnnotation | Partial<VisionAnnotation>) => {
        const color = getColor(annotation.color || 'red')
        ctx.strokeStyle = color
        ctx.fillStyle = color
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        switch (annotation.tool) {
            case 'pen':
                if (annotation.points && annotation.points.length > 0) {
                    ctx.beginPath()
                    ctx.moveTo(annotation.points[0].x, annotation.points[0].y)
                    for (let i = 1; i < annotation.points.length; i++) {
                        ctx.lineTo(annotation.points[i].x, annotation.points[i].y)
                    }
                    ctx.stroke()
                }
                break

            case 'circle':
                if (annotation.start && annotation.end) {
                    const radiusX = Math.abs(annotation.end.x - annotation.start.x) / 2
                    const radiusY = Math.abs(annotation.end.y - annotation.start.y) / 2
                    const centerX = (annotation.start.x + annotation.end.x) / 2
                    const centerY = (annotation.start.y + annotation.end.y) / 2

                    ctx.beginPath()
                    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
                    ctx.stroke()
                }
                break

            case 'arrow':
                if (annotation.start && annotation.end) {
                    const { start, end } = annotation

                    // Draw line
                    ctx.beginPath()
                    ctx.moveTo(start.x, start.y)
                    ctx.lineTo(end.x, end.y)
                    ctx.stroke()

                    // Draw arrowhead
                    const angle = Math.atan2(end.y - start.y, end.x - start.x)
                    const headLength = 15

                    ctx.beginPath()
                    ctx.moveTo(end.x, end.y)
                    ctx.lineTo(
                        end.x - headLength * Math.cos(angle - Math.PI / 6),
                        end.y - headLength * Math.sin(angle - Math.PI / 6)
                    )
                    ctx.moveTo(end.x, end.y)
                    ctx.lineTo(
                        end.x - headLength * Math.cos(angle + Math.PI / 6),
                        end.y - headLength * Math.sin(angle + Math.PI / 6)
                    )
                    ctx.stroke()
                }
                break

            case 'text':
                if (annotation.start && annotation.text) {
                    ctx.font = 'bold 16px system-ui'

                    // Draw background
                    const metrics = ctx.measureText(annotation.text)
                    const padding = 4
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
                    ctx.fillRect(
                        annotation.start.x - padding,
                        annotation.start.y - 16 - padding,
                        metrics.width + padding * 2,
                        20 + padding * 2
                    )

                    // Draw text
                    ctx.fillStyle = color
                    ctx.fillText(annotation.text, annotation.start.x, annotation.start.y)
                }
                break
        }
    }

    // Draw all annotations
    const draw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Clear canvas
        ctx.clearRect(0, 0, width, height)

        // Draw all saved annotations
        for (const annotation of annotations) {
            drawAnnotation(ctx, annotation)
        }

        // Draw current annotation being created
        if (currentAnnotation && isDrawing) {
            drawAnnotation(ctx, currentAnnotation as VisionAnnotation)
        }
    }, [annotations, currentAnnotation, isDrawing, width, height])

    // Redraw when annotations change
    useEffect(() => {
        draw()
    }, [draw])

    // Get mouse position relative to canvas
    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }

        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        }
    }

    // Mouse handlers
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (activeTool === 'text') {
            const pos = getMousePos(e)
            setTextInput({ x: pos.x, y: pos.y, visible: true })
            onStartDrawing(pos)
            setTimeout(() => textInputRef.current?.focus(), 0)
        } else {
            setIsMouseDown(true)
            onStartDrawing(getMousePos(e))
        }
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isMouseDown && activeTool !== 'text') {
            onDraw(getMousePos(e))
        }
    }

    const handleMouseUp = () => {
        if (isMouseDown && activeTool !== 'text') {
            setIsMouseDown(false)
            onEndDrawing()
        }
    }

    const handleMouseLeave = () => {
        if (isMouseDown && activeTool !== 'text') {
            setIsMouseDown(false)
            onEndDrawing()
        }
    }

    // Text input handlers
    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const input = textInputRef.current
        if (input && input.value.trim()) {
            onEndDrawing(input.value.trim())
        } else {
            onCancelDrawing()
        }
        setTextInput({ x: 0, y: 0, visible: false })
    }

    const handleTextKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancelDrawing()
            setTextInput({ x: 0, y: 0, visible: false })
        }
    }

    return (
        <div className="relative" style={{ width, height }}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="absolute inset-0 cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
            />

            {/* Text input overlay */}
            {textInput.visible && (
                <form
                    onSubmit={handleTextSubmit}
                    className="absolute"
                    style={{
                        left: textInput.x,
                        top: textInput.y - 30
                    }}
                >
                    <input
                        ref={textInputRef}
                        type="text"
                        className="px-2 py-1 text-sm bg-black/80 border border-white/30 rounded text-white placeholder-white/50 focus:outline-none focus:border-primary"
                        placeholder="Digite o texto..."
                        onKeyDown={handleTextKeyDown}
                        onBlur={handleTextSubmit}
                        autoFocus
                    />
                </form>
            )}
        </div>
    )
}
