'use client'

import { motion, useInView } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import { Microscope, Search, BookOpen, FileText, CheckCircle2 } from "lucide-react"
import { Card } from "@/components/ui/card"

export function AgentDemoResearch() {
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
            setTimeout(() => setStage(1), 500),   // Pergunta aparece
            setTimeout(() => setStage(2), 1500),  // Agente analisa
            setTimeout(() => setStage(3), 2500),  // Artigos voam
            setTimeout(() => setStage(4), 4000),  // Resultado aparece
        ]

        return () => timers.forEach(clearTimeout)
    }, [isInView])

    const articles = [
        "Clareamento Dental: Revisão Sistemática 2024",
        "Protocolos de Clareamento Caseiro",
        "Sensibilidade Pós-Clareamento: Meta-análise",
        "Guideline ADA: Clareamento Supervisionado"
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
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/40">
                            <Microscope className="w-5 h-5 text-blue-400" />
                            <span className="text-blue-400 font-semibold">Odonto Research</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                            Pesquisa científica<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                                em segundos
                            </span>
                        </h2>

                        <p className="text-lg text-slate-300 leading-relaxed">
                            Enquanto seus colegas ainda abrem o Google Scholar, você já tem a resposta com citações formatadas e prontas para usar.
                        </p>

                        <div className="space-y-3">
                            {[
                                "Busca em milhares de artigos científicos",
                                "Resumos automáticos com pontos principais",
                                "Referências formatadas em ABNT ou Vancouver"
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ delay: 0.5 + i * 0.2 }}
                                    className="flex items-center gap-3 text-slate-300"
                                >
                                    <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                                    <span>{item}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Animação Interativa */}
                    <div className="relative">
                        <Card className="p-6 bg-slate-900/80 border-blue-500/30 backdrop-blur-xl rounded-2xl">
                            {/* Header do chat */}
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                                <motion.div
                                    animate={stage >= 2 ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
                                    transition={{ duration: 0.5 }}
                                    className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500"
                                >
                                    <Microscope className="w-6 h-6 text-white" />
                                </motion.div>
                                <div>
                                    <div className="font-semibold text-white">Odonto Research</div>
                                    <div className="text-xs text-slate-400">
                                        {stage < 2 ? "Online" : stage === 2 ? "Pesquisando..." : "Resposta pronta"}
                                    </div>
                                </div>
                                {stage >= 2 && stage < 4 && (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="ml-auto"
                                    >
                                        <Search className="w-5 h-5 text-blue-400" />
                                    </motion.div>
                                )}
                            </div>

                            {/* Chat messages */}
                            <div className="space-y-4 min-h-[280px]">
                                {/* Pergunta do usuário */}
                                {stage >= 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex justify-end"
                                    >
                                        <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-br-md max-w-[80%]">
                                            Quais as evidências mais recentes sobre clareamento dental?
                                        </div>
                                    </motion.div>
                                )}

                                {/* Artigos voando */}
                                {stage >= 3 && stage < 4 && (
                                    <div className="relative h-20 overflow-hidden">
                                        {articles.map((article, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ x: -200, opacity: 0, rotate: -10 }}
                                                animate={{ x: 400, opacity: [0, 1, 1, 0], rotate: 5 }}
                                                transition={{ delay: i * 0.3, duration: 1.2 }}
                                                className="absolute top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/40 rounded-lg text-xs text-blue-300 whitespace-nowrap"
                                            >
                                                <FileText className="w-3 h-3" />
                                                {article}
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* Resposta do agente */}
                                {stage >= 4 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-3"
                                    >
                                        <div className="bg-slate-800 text-slate-100 px-4 py-3 rounded-2xl rounded-bl-md">
                                            <p className="mb-3">Encontrei <strong className="text-blue-400">47 estudos</strong> sobre clareamento dental nos últimos 2 anos. Aqui está o resumo:</p>

                                            <div className="space-y-2 text-sm">
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.2 }}
                                                    className="flex items-start gap-2"
                                                >
                                                    <span className="text-blue-400">✓</span>
                                                    <span>Peróxido de carbamida 10% ainda é gold standard para uso caseiro</span>
                                                </motion.div>
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.4 }}
                                                    className="flex items-start gap-2"
                                                >
                                                    <span className="text-blue-400">✓</span>
                                                    <span>Sensibilidade pode ser reduzida com dessensibilizantes prévios</span>
                                                </motion.div>
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.6 }}
                                                    className="flex items-start gap-2"
                                                >
                                                    <span className="text-blue-400">✓</span>
                                                    <span>LED não aumenta eficácia significativamente (meta-análise 2024)</span>
                                                </motion.div>
                                            </div>
                                        </div>

                                        {/* Referências */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.8 }}
                                            className="flex items-center gap-2 text-xs text-slate-400"
                                        >
                                            <BookOpen className="w-4 h-4" />
                                            <span>3 referências formatadas em ABNT prontas para copiar</span>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </div>
                        </Card>

                        {/* Decorative elements */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="absolute -top-6 -right-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"
                        />
                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 5, repeat: Infinity }}
                            className="absolute -bottom-6 -left-6 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
