"use client"

import { useCopilotReadable } from "@copilotkit/react-core"
import { cn } from "@/lib/utils"
import { BookOpen, FileText, ExternalLink, Quote, Sparkles } from "lucide-react"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import remarkGfm from "remark-gfm"
import { MarkdownComponents } from "@/components/agno-chat/markdown-components"

interface ResearchContentProps {
    research: {
        id: string
        title: string
        content: string
        query: string
        sources: { title: string; url: string }[]
        type: string
    }
}

export function ResearchContent({ research }: ResearchContentProps) {
    // Expose research content to AI
    useCopilotReadable({
        description: `O usuário está analisando a pesquisa científica intitulada "${research.title}" baseada na consulta "${research.query}".`,
        value: {
            title: research.title,
            query: research.query,
            content: research.content,
            sources: research.sources,
            type: research.type
        }
    })

    return (
        <div className="flex flex-col gap-8">
            {/* Query Insight Hero */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 dark:from-slate-950 dark:to-black border border-slate-800 rounded-3xl p-8 shadow-2xl">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-cyan-500/80">Objetivo da Investigação</span>
                    </div>

                    <div className="flex gap-4">
                        <Quote className="w-8 h-8 text-slate-700/50 flex-shrink-0 fill-current" />
                        <p className="text-xl md:text-2xl text-slate-200 font-light leading-relaxed italic">
                            &ldquo;{research.query}&rdquo;
                        </p>
                    </div>
                </div>
            </div>

            {/* Scientific Content */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm p-8 md:p-12 relative overflow-hidden">
                {/* Content Header Decor */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-50" />

                <div className="prose prose-slate dark:prose-invert prose-lg max-w-none 
                    prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-slate-100
                    prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-8
                    prose-li:text-slate-600 dark:prose-li:text-slate-300
                    prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-strong:font-bold
                    prose-code:text-cyan-600 dark:prose-code:text-cyan-400 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-['']
                    prose-blockquote:border-l-4 prose-blockquote:border-cyan-500 prose-blockquote:bg-slate-50 dark:prose-blockquote:bg-slate-800/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
                ">
                    <MarkdownRenderer
                        remarkPlugins={[remarkGfm]}
                        components={MarkdownComponents}
                    >
                        {research.content}
                    </MarkdownRenderer>
                </div>
            </div>

            {/* Sources & References */}
            {research.sources && research.sources.length > 0 && (
                <div className="space-y-6 mt-4">
                    <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <BookOpen className="w-5 h-5 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Literatura de Suporte e Referências</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {research.sources.map((source, idx) => (
                            <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
                            >
                                <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-slate-100 to-transparent dark:from-slate-800 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full" />

                                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-cyan-500/10 transition-colors shrink-0 z-10 border border-slate-100 dark:border-slate-700 group-hover:border-cyan-500/20">
                                    <FileText className="w-6 h-6 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                                </div>
                                <div className="flex flex-col min-w-0 z-10 flex-1">
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2 leading-snug mb-1">
                                        {source.title || "Artigo Científico Sem Título"}
                                    </span>
                                    <div className="flex items-center gap-2 mt-auto">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                            Fonte Externa
                                        </span>
                                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
