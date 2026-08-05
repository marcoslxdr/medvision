'use client'

import { motion, useInView } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import { MessageCircle, Lightbulb, Zap, CheckCircle2, Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"

export function AgentDemoGPT() {
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
            setTimeout(() => setStage(1), 500),   // Primeira pergunta
            setTimeout(() => setStage(2), 1200),  // Resposta rápida
            setTimeout(() => setStage(3), 3000),  // Segunda pergunta
            setTimeout(() => setStage(4), 3800),  // Segunda resposta
            setTimeout(() => setStage(5), 5500),  // Sugestões aparecem
        ]

        return () => timers.forEach(clearTimeout)
    }, [isInView])

    const suggestions = [
        "Qual a diferença entre resina e cerâmica?",
        "Como explicar um orçamento ao paciente?",
        "Dicas para primeira consulta"
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
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#5E5CE6]/10 border border-[#5E5CE6]/20">
                            <MessageCircle className="w-5 h-5 text-[#A855F7]" />
                            <span className="text-[#A855F7] font-semibold">MedVision</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                            Consultor<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5E5CE6] via-[#7C3AED] to-[#A855F7]">
                                Sempre Disponível
                            </span>
                        </h2>

                        <p className="text-lg text-slate-300 leading-relaxed">
                            Respostas baseadas em <strong className="text-white">livros e artigos científicos</strong>.
                            Seu consultor versátil para dúvidas do dia a dia e suporte clínico.
                        </p>

                        <div className="space-y-3">
                            {[
                                "Base de conhecimento científica atualizada",
                                "Citações de literatura confiável",
                                "Disponível 24/7"
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ delay: 0.5 + i * 0.2 }}
                                    className="flex items-center gap-3 text-slate-300"
                                >
                                    <CheckCircle2 className="w-5 h-5 text-[#A855F7] shrink-0" />
                                    <span>{item}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Animação Interativa */}
                    <div className="relative">
                        <Card className="p-6 bg-slate-900/80 border-[#5E5CE6]/20 backdrop-blur-xl rounded-2xl">
                            {/* Header do chat */}
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                                <motion.div
                                    animate={stage >= 2 ? { scale: [1, 1.1, 1] } : {}}
                                    transition={{ duration: 0.3 }}
                                    className="p-2 rounded-xl bg-gradient-to-br from-[#5E5CE6] via-[#7C3AED] to-[#A855F7]"
                                >
                                    <MessageCircle className="w-6 h-6 text-white" />
                                </motion.div>
                                <div>
                                    <div className="font-semibold text-white">MedVision</div>
                                    <div className="text-xs text-slate-400">
                                        {stage < 2 ? "Online" : "Digitando..."}
                                    </div>
                                </div>
                                <motion.div
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="ml-auto flex items-center gap-1"
                                >
                                    <div className="w-2 h-2 rounded-full bg-green-400" />
                                    <span className="text-[10px] text-green-400">Rápido</span>
                                </motion.div>
                            </div>

                            {/* Chat messages */}
                            <div className="space-y-3 min-h-[320px] overflow-hidden">
                                {/* Primeira pergunta */}
                                {stage >= 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex justify-end"
                                    >
                                        <div className="bg-purple-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-[85%] text-sm">
                                            Qual a dose máxima de anestésico para adulto?
                                        </div>
                                    </motion.div>
                                )}

                                {/* Primeira resposta - rápida e direta */}
                                {stage >= 2 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-2"
                                    >
                                        <div className="bg-slate-800 text-slate-100 px-4 py-3 rounded-2xl rounded-bl-md text-sm">
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="flex items-start gap-2"
                                            >
                                                <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <p><strong className="text-purple-300">Lidocaína 2% com epinefrina:</strong></p>
                                                    <p className="text-slate-300 mt-1">Máximo de <strong className="text-white">7 tubetes</strong> (4,4mg/kg, máx 300mg) para adulto de 70kg.</p>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Segunda pergunta */}
                                {stage >= 3 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex justify-end"
                                    >
                                        <div className="bg-purple-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-[85%] text-sm">
                                            E se o paciente for cardiopata?
                                        </div>
                                    </motion.div>
                                )}

                                {/* Segunda resposta */}
                                {stage >= 4 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-2"
                                    >
                                        <div className="bg-slate-800 text-slate-100 px-4 py-3 rounded-2xl rounded-bl-md text-sm">
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                            >
                                                <p className="text-slate-300">Para <strong className="text-purple-300">cardiopatas</strong>: máximo de <strong className="text-white">2 tubetes</strong> com vaso. Prefira <strong>mepivacaína 3%</strong> sem vaso se possível.</p>
                                                <p className="text-slate-400 text-xs mt-2 flex items-center gap-1">
                                                    <Lightbulb className="w-3 h-3" />
                                                    Sempre confirme com o cardiologista antes!
                                                </p>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Sugestões de próximas perguntas */}
                                {stage >= 5 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="pt-2"
                                    >
                                        <div className="text-[10px] text-slate-500 mb-2 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            Sugestões
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {suggestions.map((suggestion, i) => (
                                                <motion.button
                                                    key={i}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: i * 0.15 }}
                                                    className="px-3 py-1.5 text-[11px] bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 hover:bg-purple-500/20 transition-colors"
                                                >
                                                    {suggestion}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </Card>

                        {/* Decorative elements */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="absolute -top-6 -right-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"
                        />
                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 5, repeat: Infinity }}
                            className="absolute -bottom-6 -left-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
