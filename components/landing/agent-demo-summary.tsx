'use client'

import { motion, useInView } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import { BookOpen, FileText, Layers, Brain, CheckCircle2 } from "lucide-react"
import { Card } from "@/components/ui/card"

export function AgentDemoSummary() {
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
            setTimeout(() => setStage(1), 500),
            setTimeout(() => setStage(2), 1500),
            setTimeout(() => setStage(3), 3000),
            setTimeout(() => setStage(4), 4500),
        ]

        return () => timers.forEach(clearTimeout)
    }, [isInView])

    const flashcards = [
        { front: "O que é periodontite?", back: "Inflamação do periodonto..." },
        { front: "Sinais clínicos?", back: "Sangramento, mobilidade..." },
        { front: "Tratamento inicial?", back: "RAR + orientação de higiene..." },
    ]

    return (
        <div ref={ref} className="relative py-20 overflow-hidden">

            <div className="container mx-auto max-w-6xl px-4">
                <div className="grid md:grid-cols-2 gap-12 items-center">

                    {/* Texto */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.8 }}
                        className="space-y-6"
                    >
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#FF2D55]/10 border border-[#FF2D55]/20">
                            <BookOpen className="w-5 h-5 text-[#FF2D55]" />
                            <span className="text-[#FF2D55] font-semibold">Odonto Summary</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                            Qualquer tema em<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2D55] via-[#FF375F] to-[#FF4F78]">
                                material de estudo
                            </span>
                        </h2>

                        <p className="text-lg text-slate-300 leading-relaxed">
                            Digite um tema e receba resumo estruturado, flashcards interativos e mapa mental pronto para revisar.
                        </p>

                        <div className="space-y-3">
                            {[
                                "Resumos organizados por tópicos",
                                "Flashcards com repetição espaçada",
                                "Mapas mentais interativos"
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ delay: 0.5 + i * 0.2 }}
                                    className="flex items-center gap-3 text-slate-300"
                                >
                                    <CheckCircle2 className="w-5 h-5 text-[#FF2D55] shrink-0" />
                                    <span>{item}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Animação */}
                    <div className="relative">
                        <Card className="p-6 bg-slate-900/80 border-[#FF2D55]/20 backdrop-blur-xl rounded-2xl">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                                <motion.div
                                    animate={stage >= 2 ? { rotate: [0, 360] } : {}}
                                    transition={{ duration: 1 }}
                                    className="p-2 rounded-xl bg-gradient-to-br from-[#FF2D55] via-[#FF375F] to-[#FF4F78]"
                                >
                                    <BookOpen className="w-6 h-6 text-white" />
                                </motion.div>
                                <div>
                                    <div className="font-semibold text-white">Odonto Summary</div>
                                    <div className="text-xs text-slate-400">
                                        {stage < 2 ? "Pronto" : stage === 2 ? "Gerando materiais..." : "Materiais prontos!"}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 min-h-[300px]">
                                {/* Input */}
                                {stage >= 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-slate-800 rounded-xl p-3"
                                    >
                                        <div className="text-xs text-slate-500 mb-1">Tema solicitado:</div>
                                        <div className="text-[#FF2D55] font-medium">Periodontite: conceito, diagnóstico e tratamento</div>
                                    </motion.div>
                                )}

                                {/* Processando */}
                                {stage === 2 && (
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        >
                                            <Brain className="w-5 h-5 text-[#FF2D55]" />
                                        </motion.div>
                                        <span>Criando resumo, flashcards e mapa mental...</span>
                                    </div>
                                )}

                                {/* Resultados */}
                                {stage >= 3 && (
                                    <div className="space-y-4">
                                        {/* Resumo */}
                                        <motion.div
                                            initial={{ opacity: 0, x: -30 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="bg-[#FF2D55]/10 border border-[#FF2D55]/30 rounded-xl p-4"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <FileText className="w-4 h-4 text-[#FF2D55]" />
                                                <span className="font-semibold text-[#FF2D55] text-sm">Resumo Estruturado</span>
                                            </div>
                                            <div className="text-sm text-slate-300 space-y-1">
                                                <div>📌 Definição e etiologia</div>
                                                <div>📌 Classificação (AAP 2018)</div>
                                                <div>📌 Diagnóstico clínico e radiográfico</div>
                                                <div>📌 Tratamento não-cirúrgico e cirúrgico</div>
                                            </div>
                                        </motion.div>

                                        {/* Flashcards */}
                                        {stage >= 4 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="space-y-2"
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Layers className="w-4 h-4 text-[#FF2D55]" />
                                                    <span className="font-semibold text-[#FF2D55] text-sm">15 Flashcards Gerados</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {flashcards.map((card, i) => (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                                                            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                                            transition={{ delay: i * 0.2 }}
                                                            whileHover={{ scale: 1.05, rotateY: 10 }}
                                                            className="flex-1 bg-gradient-to-br from-[#FF2D55]/20 to-[#FF375F]/20 border border-[#FF2D55]/40 rounded-lg p-3 cursor-pointer"
                                                        >
                                                            <div className="text-xs text-[#FF2D55]/80">{card.front}</div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
