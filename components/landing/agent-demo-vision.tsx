'use client'

import { motion, useInView } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import { Eye, Scan, Target, AlertCircle, CheckCircle2 } from "lucide-react"
import { Card } from "@/components/ui/card"

export function AgentDemoVision() {
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once: false, amount: 0.4 })
    const [stage, setStage] = useState(0)
    const [prevInView, setPrevInView] = useState(isInView)

    // Ajusta o estado durante o render quando isInView muda (padrão React)
    if (prevInView !== isInView) {
        setPrevInView(isInView)
        if (!isInView) {
            setStage(0)
        }
    }

    useEffect(() => {
        if (!isInView) {
            return
        }

        const timers = [
            setTimeout(() => setStage(1), 500),   // Imagem aparece
            setTimeout(() => setStage(2), 1500),  // Scanner passa
            setTimeout(() => setStage(3), 3500),  // Marcações aparecem
            setTimeout(() => setStage(4), 5000),  // Laudo aparece
        ]

        return () => timers.forEach(clearTimeout)
    }, [isInView])

    const findings = [
        { x: 20, y: 30, label: "Lesão periapical", color: "red" },
        { x: 60, y: 45, label: "Cárie interproximal", color: "orange" },
        { x: 75, y: 25, label: "Restauração íntegra", color: "green" },
    ]

    return (
        <div ref={ref} className="relative py-20 overflow-hidden">

            <div className="container mx-auto max-w-6xl px-4">
                <div className="grid md:grid-cols-2 gap-12 items-center">

                    {/* Animação Interativa - Primeiro em mobile */}
                    <div className="relative order-2 md:order-1">
                        <Card className="p-6 bg-slate-900/80 border-cyan-500/30 backdrop-blur-xl rounded-2xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                                <motion.div
                                    animate={stage >= 2 ? { scale: [1, 1.1, 1] } : {}}
                                    transition={{ duration: 0.5, repeat: stage === 2 ? Infinity : 0, repeatDelay: 0.5 }}
                                    className="p-2 rounded-xl bg-gradient-to-br from-[#FF6B6B] via-[#EE5A70] to-[#DA4167]"
                                >
                                    <Eye className="w-6 h-6 text-white" />
                                </motion.div>
                                <div>
                                    <div className="font-semibold text-white">Med Vision</div>
                                    <div className="text-xs text-slate-400">
                                        {stage < 2 ? "Pronto para análise" : stage === 2 ? "Analisando imagem..." : "Análise completa"}
                                    </div>
                                </div>
                                {stage === 2 && (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="ml-auto"
                                    >
                                        <Scan className="w-5 h-5 text-cyan-400" />
                                    </motion.div>
                                )}
                            </div>

                            {/* Área da imagem */}
                            <div className="relative aspect-video bg-slate-800 rounded-xl overflow-hidden mb-4">
                                {/* Imagem de radiografia placeholder */}
                                {stage >= 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center"
                                    >
                                        <div className="text-center">
                                            <div className="text-6xl mb-2">🦷</div>
                                            <div className="text-xs text-slate-500">Radiografia Periapical</div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Scanner line */}
                                {stage === 2 && (
                                    <motion.div
                                        initial={{ top: 0 }}
                                        animate={{ top: "100%" }}
                                        transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                                        style={{ boxShadow: "0 0 20px rgba(0, 255, 255, 0.5)", willChange: "top" }}
                                    />
                                )}

                                {/* Marcações */}
                                {stage >= 3 && findings.map((finding, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: i * 0.3, type: "spring" }}
                                        className="absolute"
                                        style={{ left: `${finding.x}%`, top: `${finding.y}%` }}
                                    >
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        >
                                            <Target
                                                className="w-8 h-8"
                                                style={{
                                                    color: finding.color === 'red' ? '#ef4444' :
                                                        finding.color === 'orange' ? '#f97316' : '#22c55e'
                                                }}
                                            />
                                        </motion.div>
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 }}
                                            className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded text-xs font-medium
                        ${finding.color === 'red' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                                                    finding.color === 'orange' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' :
                                                        'bg-green-500/20 text-green-400 border border-green-500/40'}`}
                                        >
                                            {finding.label}
                                        </motion.div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Laudo */}
                            {stage >= 4 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-slate-800/50 rounded-xl p-4 border border-cyan-500/20"
                                >
                                    <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-cyan-400">
                                        <AlertCircle className="w-4 h-4" />
                                        Laudo Radiográfico
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-300">
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                                            <strong>Achados:</strong> Imagem radiolúcida periapical em região do 36, sugestiva de lesão periapical crônica.
                                        </motion.div>
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                                            <strong>Diagnóstico diferencial:</strong> Granuloma periapical, Cisto periapical.
                                        </motion.div>
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                                            <strong>Conduta sugerida:</strong> Tratamento endodôntico ou retratamento.
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}
                        </Card>

                        {/* Decorative elements - Otimizado com GPU acceleration */}
                        <motion.div
                            animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
                            transition={{ duration: 6, repeat: Infinity }}
                            className="absolute -top-8 -left-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"
                            style={{ willChange: "transform", transform: "translateZ(0)" }}
                        />
                    </div>

                    {/* Texto */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.8 }}
                        className="space-y-6 order-1 md:order-2"
                    >
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#FF6B6B]/10 border border-[#FF6B6B]/20">
                            <Eye className="w-5 h-5 text-[#FF6B6B]" />
                            <span className="text-[#FF6B6B] font-semibold">Med Vision</span>
                            <span className="px-2 py-0.5 bg-[#DA4167] rounded-full text-xs text-white font-bold">PRO</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                            Radiografias analisadas<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B6B] via-[#EE5A70] to-[#DA4167]">
                                em segundos
                            </span>
                        </h2>

                        <p className="text-lg text-slate-300 leading-relaxed">
                            Envie qualquer imagem radiográfica e receba uma análise detalhada com identificação de achados e sugestões de diagnóstico diferencial.
                        </p>

                        <div className="space-y-3">
                            {[
                                "Análise de panorâmicas, periapicais e tomografias",
                                "Identificação automática de lesões e alterações",
                                "Laudos técnicos prontos para documentação"
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ delay: 0.5 + i * 0.2 }}
                                    className="flex items-center gap-3 text-slate-300"
                                >
                                    <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                                    <span>{item}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* CTA especial */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: 1 }}
                            className="p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/30"
                        >
                            <p className="text-sm text-cyan-300">
                                <strong>Exclusivo do Plano PRO</strong> — Análise ilimitada de imagens radiográficas com IA avançada.
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
