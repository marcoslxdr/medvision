'use client'

import { motion, useInView } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import { Sparkles, Route, ArrowRight, FlaskConical, GraduationCap, FileText, ScanEye, CheckCircle2 } from "lucide-react"
import { Card } from "@/components/ui/card"

export function AgentDemoFlow() {
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
            setTimeout(() => setStage(3), 2800),  // Roteamento acontece
            setTimeout(() => setStage(4), 4500),  // Especialista responde
        ]

        return () => timers.forEach(clearTimeout)
    }, [isInView])

    const agents = [
        { icon: FlaskConical, name: "Pesquisador", color: "from-[#BF5AF2] via-[#9D4EDD] to-[#7B2CBF]", delay: 0 },
        { icon: GraduationCap, name: "Estudos", color: "from-[#FF9F0A] via-[#FF6B35] to-[#FF453A]", delay: 0.15 },
        { icon: FileText, name: "Redator", color: "from-[#30D158] via-[#00C7BE] to-[#00B4D8]", delay: 0.3 },
        { icon: ScanEye, name: "Diagnóstico", color: "from-[#FF6B6B] via-[#EE5A70] to-[#DA4167]", delay: 0.45 },
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
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/20">
                            <Sparkles className="w-5 h-5 text-[#00D4FF]" />
                            <span className="text-[#00D4FF] font-semibold">MedVision</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                            Roteamento<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] via-[#00A3FF] to-[#0066FF]">
                                Inteligente
                            </span>
                        </h2>

                        <p className="text-lg text-slate-300 leading-relaxed">
                            Você não precisa saber qual especialista usar. O MedVision analisa sua pergunta e automaticamente direciona para o agente mais adequado.
                        </p>

                        <div className="space-y-3">
                            {[
                                "Análise semântica da sua dúvida",
                                "Direcionamento automático para o especialista",
                                "Zero configuração: basta perguntar"
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ delay: 0.5 + i * 0.2 }}
                                    className="flex items-center gap-3 text-slate-300"
                                >
                                    <CheckCircle2 className="w-5 h-5 text-[#00D4FF] shrink-0" />
                                    <span>{item}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Animação Interativa */}
                    <div className="relative">
                        <Card className="p-6 bg-slate-900/80 border-[#00D4FF]/20 backdrop-blur-xl rounded-2xl">
                            {/* Header do chat */}
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                                <motion.div
                                    animate={stage >= 2 ? {
                                        scale: [1, 1.2, 1],
                                        boxShadow: ["0 0 0 0 rgba(6,182,212,0)", "0 0 20px 10px rgba(6,182,212,0.3)", "0 0 0 0 rgba(6,182,212,0)"]
                                    } : {}}
                                    transition={{ duration: 0.8 }}
                                    className="p-2 rounded-xl bg-gradient-to-br from-[#00D4FF] via-[#00A3FF] to-[#0066FF]"
                                >
                                    <Sparkles className="w-6 h-6 text-white" />
                                </motion.div>
                                <div>
                                    <div className="font-semibold text-white">MedVision</div>
                                    <div className="text-xs text-slate-400">
                                        {stage < 2 ? "Pronto" : stage === 2 ? "Analisando contexto..." : stage === 3 ? "Roteando..." : "Conectado ao Pesquisador"}
                                    </div>
                                </div>
                                {stage >= 2 && stage < 4 && (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="ml-auto"
                                    >
                                        <Route className="w-5 h-5 text-cyan-400" />
                                    </motion.div>
                                )}
                            </div>

                            {/* Chat messages */}
                            <div className="space-y-4 min-h-[300px]">
                                {/* Pergunta do usuário */}
                                {stage >= 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex justify-end"
                                    >
                                        <div className="bg-cyan-600 text-white px-4 py-3 rounded-2xl rounded-br-md max-w-[80%]">
                                            Quais artigos recentes falam sobre clareamento em dentes vitais?
                                        </div>
                                    </motion.div>
                                )}

                                {/* Animação de roteamento - agentes aparecem e um é selecionado */}
                                {stage >= 3 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="relative py-4"
                                    >
                                        <div className="text-xs text-slate-500 text-center mb-3">Identificando especialista ideal...</div>
                                        <div className="flex justify-center gap-3">
                                            {agents.map((agent, i) => {
                                                const isSelected = i === 0 // Pesquisador é selecionado
                                                return (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{
                                                            scale: stage >= 4 ? (isSelected ? 1.2 : 0.8) : 1,
                                                            opacity: stage >= 4 ? (isSelected ? 1 : 0.3) : 1,
                                                        }}
                                                        transition={{ delay: agent.delay, duration: 0.3 }}
                                                        className="flex flex-col items-center gap-1"
                                                    >
                                                        <motion.div
                                                            className={`p-3 rounded-xl bg-gradient-to-br ${agent.color} ${isSelected && stage >= 4 ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`}
                                                            animate={isSelected && stage >= 4 ? {
                                                                boxShadow: ["0 0 0 0 rgba(255,255,255,0)", "0 0 20px 5px rgba(168,85,247,0.5)", "0 0 0 0 rgba(255,255,255,0)"]
                                                            } : {}}
                                                            transition={{ duration: 1, repeat: stage >= 4 ? 2 : 0 }}
                                                            style={{ willChange: "box-shadow, transform" }}
                                                        >
                                                            <agent.icon className="w-5 h-5 text-white" />
                                                        </motion.div>
                                                        <span className={`text-[10px] ${isSelected && stage >= 4 ? 'text-white font-semibold' : 'text-slate-500'}`}>
                                                            {agent.name}
                                                        </span>
                                                    </motion.div>
                                                )
                                            })}
                                        </div>

                                        {stage >= 4 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.5 }}
                                                className="flex items-center justify-center gap-2 mt-4 text-sm text-purple-400"
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                                <span>Conectando ao <strong>Pesquisador</strong></span>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Resposta do agente selecionado */}
                                {stage >= 4 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.8 }}
                                        className="space-y-3"
                                    >
                                        <div className="flex items-center gap-2 text-xs text-purple-400">
                                            <div className="p-1 rounded bg-gradient-to-br from-purple-500 to-indigo-500">
                                                <FlaskConical className="w-3 h-3 text-white" />
                                            </div>
                                            <span>Pesquisador assumiu a conversa</span>
                                        </div>
                                        <div className="bg-slate-800 text-slate-100 px-4 py-3 rounded-2xl rounded-bl-md">
                                            <p className="text-sm">Encontrei <strong className="text-purple-400">23 artigos</strong> sobre clareamento em dentes vitais publicados nos últimos 12 meses...</p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </Card>

                        {/* Decorative elements - Otimizado com GPU acceleration */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 5, repeat: Infinity }}
                            className="absolute -top-6 -right-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"
                            style={{ willChange: "transform", transform: "translateZ(0)" }}
                        />
                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 6, repeat: Infinity }}
                            className="absolute -bottom-6 -left-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"
                            style={{ willChange: "transform", transform: "translateZ(0)" }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
