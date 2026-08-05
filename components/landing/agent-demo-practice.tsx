'use client'

import { motion, useInView } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import { GraduationCap, CheckCircle, XCircle, BarChart3, CheckCircle2 } from "lucide-react"
import { Card } from "@/components/ui/card"

export function AgentDemoPractice() {
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once: false, amount: 0.4 })
    const [stage, setStage] = useState(0)
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
    const [prevInView, setPrevInView] = useState(isInView)

    // Ajusta o estado durante o render quando isInView muda (padrão React)
    if (prevInView !== isInView) {
        setPrevInView(isInView)
        if (!isInView) {
            setStage(0)
            setSelectedAnswer(null)
        }
    }

    useEffect(() => {
        if (!isInView) {
            return
        }

        const timers = [
            setTimeout(() => setStage(1), 500),
            setTimeout(() => setStage(2), 2000),
            setTimeout(() => { setSelectedAnswer(1); setStage(3); }, 3500),
            setTimeout(() => setStage(4), 5000),
        ]

        return () => timers.forEach(clearTimeout)
    }, [isInView])

    const question = {
        text: "Qual agente etiológico é considerado o principal responsável pela periodontite?",
        options: [
            "Streptococcus mutans",
            "Porphyromonas gingivalis",
            "Candida albicans",
            "Lactobacillus acidophilus"
        ],
        correct: 1,
        explanation: "P. gingivalis é considerado um patógeno-chave na periodontite, sendo um dos principais componentes do complexo vermelho de Socransky."
    }

    return (
        <div ref={ref} className="relative py-20 overflow-hidden">

            <div className="container mx-auto max-w-6xl px-4">
                <div className="grid md:grid-cols-2 gap-12 items-center">

                    {/* Animação - primeiro em mobile */}
                    <div className="relative order-2 md:order-1">
                        <Card className="p-6 bg-slate-900/80 border-[#FF9F0A]/20 backdrop-blur-xl rounded-2xl">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-[#FF9F0A] via-[#FF6B35] to-[#FF453A]">
                                    <GraduationCap className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <div className="font-semibold text-white">Odonto Practice</div>
                                    <div className="text-xs text-slate-400">Simulado de Periodontia</div>
                                </div>
                                <div className="ml-auto text-sm text-[#FF9F0A]">Questão 1/30</div>
                            </div>

                            <div className="min-h-[320px]">
                                {/* Questão */}
                                {stage >= 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-4"
                                    >
                                        <div className="text-slate-100 font-medium leading-relaxed">
                                            {question.text}
                                        </div>

                                        <div className="space-y-2">
                                            {question.options.map((option, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.1 * i }}
                                                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedAnswer === null
                                                        ? 'bg-slate-800 border-slate-700 hover:border-purple-500/50'
                                                        : selectedAnswer === i
                                                            ? i === question.correct
                                                                ? 'bg-green-500/20 border-green-500'
                                                                : 'bg-red-500/20 border-red-500'
                                                            : i === question.correct && stage >= 3
                                                                ? 'bg-green-500/20 border-green-500'
                                                                : 'bg-slate-800/50 border-slate-700/50 opacity-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-sm text-purple-400">
                                                            {String.fromCharCode(65 + i)}
                                                        </span>
                                                        <span className={`text-sm ${selectedAnswer !== null && i === question.correct ? 'text-green-400' : 'text-slate-300'}`}>
                                                            {option}
                                                        </span>
                                                        {stage >= 3 && selectedAnswer !== null && (
                                                            i === question.correct ? (
                                                                <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                                                            ) : i === selectedAnswer ? (
                                                                <XCircle className="w-5 h-5 text-red-500 ml-auto" />
                                                            ) : null
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>

                                        {/* Explicação */}
                                        {stage >= 4 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mt-4"
                                            >
                                                <div className="text-sm font-semibold text-purple-400 mb-2">💡 Explicação:</div>
                                                <div className="text-sm text-slate-300">{question.explanation}</div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Gráfico de desempenho */}
                                {stage >= 4 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700"
                                    >
                                        <BarChart3 className="w-5 h-5 text-purple-400" />
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                                                <span>Seu desempenho</span>
                                                <span className="text-green-400">85%</span>
                                            </div>
                                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: "85%" }}
                                                    transition={{ delay: 0.8, duration: 1 }}
                                                    className="h-full bg-gradient-to-r from-purple-500 to-violet-500"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Texto */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.8 }}
                        className="space-y-6 order-1 md:order-2"
                    >
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#FF9F0A]/10 border border-[#FF9F0A]/20">
                            <GraduationCap className="w-5 h-5 text-[#FF9F0A]" />
                            <span className="text-[#FF9F0A] font-semibold">Odonto Practice</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                            Treine para provas<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9F0A] via-[#FF6B35] to-[#FF453A]">
                                e residência
                            </span>
                        </h2>

                        <p className="text-lg text-slate-300 leading-relaxed">
                            Simulados inteligentes que se adaptam ao seu nível. Questões comentadas com foco no que você precisa melhorar.
                        </p>

                        <div className="space-y-3">
                            {[
                                "Questões baseadas em provas reais",
                                "Comentários detalhados por especialistas",
                                "Análise de desempenho por tema"
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ delay: 0.5 + i * 0.2 }}
                                    className="flex items-center gap-3 text-slate-300"
                                >
                                    <CheckCircle2 className="w-5 h-5 text-[#FF9F0A] shrink-0" />
                                    <span>{item}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
