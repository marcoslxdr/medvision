// Documentação técnica interna do MedVision
// Last synced from CLAUDE.md: 2026-01-28
// PROTEGIDA COM SENHA - Acesso restrito

'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import {
  Layers,
  GitBranch,
  Sparkles,
  Database,
  Shield,
  Plug,
  Terminal,
  Rocket,
  MessageSquare,
  Eye,
  Search,
  PlayCircle,
  BookOpen,
  Award,
  Users,
  TrendingUp,
  FlaskConical,
  Brain,
  GitMerge,
  HardDrive,
  Server,
  Cpu,
  Globe,
  FileText,
  CheckCircle2,
  Clock,
  LogOut,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { DocsSidebar } from '@/components/docs/docs-sidebar'
import { CodeBlock } from '@/components/docs/code-block'
import { DocsAuth } from '@/components/docs/docs-auth'
import { initDocsProtection, logoutDocs } from '@/components/docs/docs-content-protection'
import { DOC_SECTIONS } from '@/components/docs/table-of-contents'

const DOCS_PASSWORD = '@odontogpt2026#'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex items-center gap-4 border-b border-border/30 pb-6">
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-heading font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'primary' | 'green' | 'yellow' | 'red' }) {
  const styles = {
    default: 'bg-muted/50 text-muted-foreground border-border/30',
    primary: 'bg-primary/10 text-primary border-primary/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${styles[variant]}`}>
      {children}
    </span>
  )
}

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/30">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20 border-b border-border/30">
      {children}
    </th>
  )
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-4 py-3 text-sm text-foreground/80 border-b border-border/20 last-of-type:border-0 ${mono ? 'font-mono text-xs' : ''}`}>
      {children}
    </td>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const subscribeNoop = () => () => {}

export default function DocumentacaoPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('docs_authenticated') === 'true'
  })
  const isLoading = useSyncExternalStore(
    subscribeNoop,
    () => false,
    () => true
  )

  // Inicializa proteção quando autenticado
  useEffect(() => {
    if (isAuthenticated) {
      const cleanup = initDocsProtection()
      return cleanup
    }
  }, [isAuthenticated])

  // Tela de carregamento
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  // Se não autenticado, mostra tela de login
  if (!isAuthenticated) {
    return (
      <DocsAuth
        correctPassword={DOCS_PASSWORD}
        onAuthenticate={() => setIsAuthenticated(true)}
      />
    )
  }

  // Conteúdo protegido
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 select-none">

      {/* ── Page Header ── */}
      <header className="mb-12 pb-8 border-b border-border/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
              Documentação Interna
            </span>
            <span className="text-[10px] text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-full border border-border/30">
              v0.1.4
            </span>
            <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
              🔒 Protegida
            </span>
          </div>
          <button
            onClick={logoutDocs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors text-xs font-medium"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
        <h1 className="text-3xl md:text-4xl font-heading font-semibold text-foreground tracking-tight">
          MedVision — Docs
        </h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-xl">
          Hub centralizado de documentação técnica do projeto. Referência para arquitetura, integrações, banco de dados e ambiente de desenvolvimento.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            'Next.js 16.0.10',
            'React 19.2.3',
            'TypeScript 5',
            'Supabase',
            'Vercel',
            'Tailwind CSS 4',
          ].map((tech) => (
            <span key={tech} className="text-[11px] px-2.5 py-1 rounded-md bg-muted/30 text-muted-foreground border border-border/20 font-mono">
              {tech}
            </span>
          ))}
        </div>
      </header>

      {/* ── Two-column layout ── */}
      <div className="flex flex-col md:flex-row gap-12">

        {/* Sidebar */}
        <DocsSidebar sections={DOC_SECTIONS} />

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-14">

          {/* ═══════════════════════════════════════════════
              1. VISÃO GERAL
          ═══════════════════════════════════════════════ */}
          <section id="visao-geral" className="scroll-mt-8">
            <GlassCard className="p-8 space-y-8">
              <SectionHeader
                icon={Layers}
                title="Visão Geral"
                description="Projeto, tech stack e versão atual"
              />

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Sobre o Projeto</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  MedVision é uma plataforma SaaS educacional full-stack para profissionais de odontologia, com integração avançada de IA (OpenAI, Perplexity Sonar) e sistema de vendas comportamental sofisticado. Permite que dentistas usem assistentes de IA para consultas clínicas, análise de imagens, pesquisa bibliográfica, geração de conteúdo educacional e acompanhamento de estudos.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Tech Stack</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      icon: Globe,
                      label: 'Frontend',
                      items: ['Next.js 16 (App Router)', 'React 19.2.3', 'TypeScript 5', 'Tailwind CSS 4', 'Radix UI + Shadcn'],
                    },
                    {
                      icon: Server,
                      label: 'Backend',
                      items: ['Supabase (Auth + DB)', 'PostgreSQL', 'Server Actions', 'Vercel Blob', 'Bunny CDN'],
                    },
                    {
                      icon: Cpu,
                      label: 'IA & Serviços',
                      items: ['OpenAI (GPT-4o)', 'OpenRouter', 'Perplexity Sonar', 'Vercel AI SDK', 'Sentry + Analytics'],
                    },
                  ].map(({ icon: Icon, label, items }) => (
                    <div key={label} className="rounded-xl border border-border/30 bg-muted/10 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{label}</span>
                      </div>
                      <ul className="space-y-1">
                        {items.map((item) => (
                          <li key={item} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-primary/50 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Deployment</h3>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/20 border border-border/30">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Vercel (production)
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/20 border border-border/30">
                    <HardDrive className="h-3.5 w-3.5 text-primary" /> Supabase (database + auth)
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/20 border border-border/30">
                    <Globe className="h-3.5 w-3.5 text-primary" /> Bunny CDN (vídeos)
                  </span>
                </div>
              </div>
            </GlassCard>
          </section>

          {/* ═══════════════════════════════════════════════
              2. ARQUITETURA
          ═══════════════════════════════════════════════ */}
          <section id="arquitetura" className="scroll-mt-8">
            <GlassCard className="p-8 space-y-8">
              <SectionHeader
                icon={GitBranch}
                title="Arquitetura"
                description="Estrutura do sistema e camadas"
              />

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Camadas do Sistema</h3>
                <div className="space-y-2">
                  {[
                    { layer: 'Frontend Layer', desc: 'Next.js App Router, React 19, Tailwind CSS, Radix UI', color: 'border-cyan-500/30 bg-cyan-500/5' },
                    { layer: 'API Layer', desc: 'Route Handlers (/api/*), Server Actions (/app/actions/*)', color: 'border-blue-500/30 bg-blue-500/5' },
                    { layer: 'Backend Layer', desc: 'Supabase (Auth + PostgreSQL + Storage + RLS policies)', color: 'border-violet-500/30 bg-violet-500/5' },
                    { layer: 'Storage Layer', desc: 'Vercel Blob (arquivos), Bunny CDN (vídeos), Supabase Storage (avatares)', color: 'border-pink-500/30 bg-pink-500/5' },
                  ].map(({ layer, desc, color }, i, arr) => (
                    <div key={layer}>
                      <div className={`rounded-xl border px-5 py-4 ${color}`}>
                        <div className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-0.5">{layer}</div>
                        <div className="text-xs text-muted-foreground">{desc}</div>
                      </div>
                      {i < arr.length - 1 && (
                        <div className="flex justify-center my-1">
                          <div className="h-4 w-0.5 bg-border/30" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Estrutura do App</h3>
                <TableWrapper>
                  <thead>
                    <tr>
                      <Th>Rota</Th>
                      <Th>Propósito</Th>
                      <Th>Acesso</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['/dashboard/*', 'Área principal do usuário (chat, biblioteca, vídeos)', 'Autenticado'],
                      ['/admin/*', 'Painel de administração e gestão de pipeline', 'admin / vendedor'],
                      ['/api/*', 'Route handlers (chat, upload, webhook, cron)', 'Varies'],
                      ['/login, /register', 'Autenticação pública', 'Público'],
                      ['/', 'Landing page', 'Público'],
                    ].map(([route, purpose, access]) => (
                      <tr key={route}>
                        <Td mono>{route}</Td>
                        <Td>{purpose}</Td>
                        <Td><Badge variant={access === 'Público' ? 'default' : access === 'Autenticado' ? 'green' : 'primary'}>{access}</Badge></Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrapper>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Padrão de Autenticação por Rota</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  O projeto <strong className="text-foreground">não usa middleware.ts</strong>. A proteção de rotas é feita por cada layout individualmente via <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono">getUser()</code> + <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono">redirect()</code>. O Supabase SSR client usa React <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono">cache()</code> para evitar chamadas redundantes por request.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Estrutura de Componentes</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono text-muted-foreground">
                  {[
                    'components/ui/',
                    'components/admin/',
                    'components/dashboard/',
                    'components/chat/',
                    'components/sidebar/',
                    'components/layout/',
                    'components/artifacts/',
                    'components/vision/',
                    'components/odontoflix/',
                  ].map((path) => (
                    <div key={path} className="px-3 py-2 rounded-lg bg-muted/20 border border-border/20 truncate">
                      {path}
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </section>

          {/* ═══════════════════════════════════════════════
              3. FUNCIONALIDADES
          ═══════════════════════════════════════════════ */}
          <section id="funcionalidades" className="scroll-mt-8">
            <GlassCard className="p-8 space-y-8">
              <SectionHeader
                icon={Sparkles}
                title="Funcionalidades"
                description="Features core e em desenvolvimento"
              />

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Features Core</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      icon: Sparkles,
                      name: 'MedVision Chat',
                      desc: 'Assistente clínico com streaming bidirecional via Vercel AI SDK. Suporte a upload de imagens e documentos.',
                      status: 'Produção',
                      doc: '/docs/medvision-chat.md',
                    },
                    {
                      icon: Eye,
                      name: 'Med Vision',
                      desc: 'Análise visual por IA de radiografias e imagens clínicas. Upload direto no chat ou módulo dedicado.',
                      status: 'Produção',
                      doc: '/docs/odonto-vision.md',
                    },
                    {
                      icon: Search,
                      name: 'Research Agent',
                      desc: 'Busca e síntese de informações científicas via Perplexity Sonar. Gera pesquisas com referências.',
                      status: 'Produção',
                    },
                    {
                      icon: PlayCircle,
                      name: 'OdontoFlix',
                      desc: 'Plataforma de streaming de vídeos educacionais com player Bunny CDN e rastreamento de progresso.',
                      status: 'Produção',
                    },
                    {
                      icon: BookOpen,
                      name: 'Biblioteca de Artefatos',
                      desc: 'Geração e armazenamento de Pesquisas, Resumos, Flashcards, Laudos, Mapas Mentais e Simulados.',
                      status: 'Produção',
                    },
                    {
                      icon: Award,
                      name: 'Certificados',
                      desc: 'Geração de certificados de conclusão em PDF com templates personalizados (jsPDF).',
                      status: 'Produção',
                    },
                    {
                      icon: Users,
                      name: 'Sistema de Trial',
                      desc: 'Conversão Trial → Pro com tracking de dias, risco de churn e identificação de oportunidades.',
                      status: 'Produção',
                    },
                    {
                      icon: TrendingUp,
                      name: 'Pipeline de Vendas',
                      desc: '8 estágios comportamentais: cadastro → ativo → trial → convertido → risco_churn → perdido.',
                      status: 'Produção',
                    },
                  ].map(({ icon: Icon, name, desc, status, doc }) => (
                    <div key={name} className="rounded-xl border border-border/30 bg-muted/5 p-4 space-y-2 hover:bg-muted/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{name}</span>
                        </div>
                        <Badge variant="green">{status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                      {doc && (
                        <a
                          href={doc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-1"
                        >
                          Ver documentação →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Em Desenvolvimento</h3>
                <div className="space-y-3">
                  {[
                    { icon: Brain, name: 'Semantic Caching', desc: 'Otimização de respostas IA com cache semântico por similaridade.', status: 'Em Dev' },
                    { icon: GitMerge, name: 'Shared Memory', desc: 'Preservação de contexto cross-session para experiência personalizada.', status: 'Em Dev' },
                    { icon: FileText, name: 'Knowledge Documents', desc: 'Base de conhecimento estruturada com busca vetorial (RAG).', status: 'Em Dev' },
                    { icon: FlaskConical, name: 'Artifact Versioning', desc: 'Rastreamento de histórico e versões de artefatos gerados.', status: 'Planejado' },
                  ].map(({ icon: Icon, name, desc, status }) => (
                    <div key={name} className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border/20 bg-muted/5">
                      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-foreground">{name}</span>
                          <Badge variant={status === 'Em Dev' ? 'yellow' : 'default'}>{status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </section>

          {/* ═══════════════════════════════════════════════
              4. BANCO DE DADOS
          ═══════════════════════════════════════════════ */}
          <section id="banco-de-dados" className="scroll-mt-8">
            <GlassCard className="p-8 space-y-8">
              <SectionHeader
                icon={Database}
                title="Banco de Dados"
                description="Tabelas, schemas e storage"
              />

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="px-3 py-1.5 rounded-lg bg-muted/20 border border-border/30">
                  PostgreSQL via Supabase
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-muted/20 border border-border/30">
                  60+ migrations em /supabase/migrations/
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-muted/20 border border-border/30">
                  Row Level Security (RLS) ativo
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-muted/20 border border-border/30">
                  Full-text search habilitado
                </span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Tabelas Principais</h3>
                <TableWrapper>
                  <thead>
                    <tr>
                      <Th>Tabela</Th>
                      <Th>Propósito</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['profiles', 'Dados do usuário + roles (admin, vendedor, user)'],
                      ['courses', 'Catálogo de cursos + metadados'],
                      ['lessons', 'Conteúdo individual de aulas'],
                      ['chat_messages', 'Histórico de conversas (retenção 30 dias)'],
                      ['chat_threads', 'Agrupamento de conversas'],
                      ['agent_sessions', 'Rastreamento de sessões de IA'],
                      ['artifacts', 'Conteúdos gerados (Pesquisas, Flashcards, Laudos, etc.)'],
                      ['materials', 'Recursos de aprendizado (PDFs, links extras)'],
                      ['live_events', 'Agendamento de webinars'],
                      ['subscriptions', 'Planos (trial, pro) e status'],
                      ['pipeline', 'Rastreamento de funil de vendas (8 estágios)'],
                      ['cold_leads', 'Captura de leads frios'],
                      ['notifications', 'Notificações do usuário'],
                      ['knowledge_documents', 'Base de conhecimento estruturada'],
                      ['shared_memory', 'Contexto cross-session para IA'],
                      ['course_progress', 'Progresso do usuário nos cursos'],
                    ].map(([table, purpose]) => (
                      <tr key={table}>
                        <Td mono>{table}</Td>
                        <Td>{purpose}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrapper>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Storage Buckets</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { bucket: 'lives-assets', desc: 'Conteúdo de eventos ao vivo' },
                    { bucket: 'profile-avatars', desc: 'Avatares de usuários' },
                    { bucket: 'course-materials', desc: 'Materiais dos cursos' },
                    { bucket: 'artifact-files', desc: 'Arquivos de artefatos' },
                  ].map(({ bucket, desc }) => (
                    <div key={bucket} className="px-4 py-3 rounded-xl border border-border/30 bg-muted/10">
                      <div className="font-mono text-xs text-foreground/80 mb-0.5">{bucket}</div>
                      <div className="text-xs text-muted-foreground">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Políticas Importantes</h3>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-primary/50" />Retenção de <code className="bg-muted/50 px-1 rounded font-mono">chat_messages</code>: 30 dias</li>
                  <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-primary/50" />Soft delete implementado em <code className="bg-muted/50 px-1 rounded font-mono">cold_leads</code> (GDPR)</li>
                  <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-primary/50" />Índices otimizados para queries por <code className="bg-muted/50 px-1 rounded font-mono">user_id</code> e <code className="bg-muted/50 px-1 rounded font-mono">created_at</code></li>
                </ul>
              </div>
            </GlassCard>
          </section>

          {/* ═══════════════════════════════════════════════
              5. AUTENTICAÇÃO & AUTORIZAÇÃO
          ═══════════════════════════════════════════════ */}
          <section id="autenticacao" className="scroll-mt-8">
            <GlassCard className="p-8 space-y-8">
              <SectionHeader
                icon={Shield}
                title="Autenticação & Autorização"
                description="Fluxo de auth e controle de acesso"
              />

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Fluxo de Autenticação</h3>
                <div className="space-y-2">
                  {[
                    { step: '1', label: 'Supabase Auth', desc: 'Login com email/senha. JWT gerado e armazenado em cookies HTTP-only.' },
                    { step: '2', label: 'SSR Client', desc: 'createClient() usa React cache() por request. Evita chamadas redundantes.' },
                    { step: '3', label: 'Layout Check', desc: 'Cada layout protegido chama getUser(). Se null → redirect("/login").' },
                    { step: '4', label: 'Role Check', desc: 'Admin panel verifica profiles.role → app_metadata → user_metadata → DEFAULT.' },
                  ].map(({ step, label, desc }) => (
                    <div key={step} className="flex gap-4">
                      <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                        {step}
                      </div>
                      <div className="flex-1 pb-4 border-l border-border/20 pl-4 ml-[-1px]">
                        <div className="text-sm font-medium text-foreground mb-0.5">{label}</div>
                        <div className="text-xs text-muted-foreground">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Papéis (Roles)</h3>
                <TableWrapper>
                  <thead>
                    <tr>
                      <Th>Role</Th>
                      <Th>Acesso</Th>
                      <Th>Origem</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['admin', 'Total: dashboard + admin panel completo', 'profiles.role'],
                      ['vendedor', 'Admin panel (pipeline + usuários apenas)', 'profiles.role'],
                      ['user', 'Dashboard do usuário apenas', 'default'],
                    ].map(([role, access, origin]) => (
                      <tr key={role}>
                        <Td mono>{role}</Td>
                        <Td>{access}</Td>
                        <Td mono>{origin}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrapper>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Rotas Protegidas</h3>
                <div className="space-y-1.5">
                  {[
                    { path: '/dashboard/*', req: 'getUser() !== null', redirect: '/login' },
                    { path: '/admin/*', req: 'role === admin || vendedor', redirect: '/dashboard' },
                    { path: '/settings, /profile', req: 'getUser() !== null', redirect: '/login' },
                  ].map(({ path, req, redirect }) => (
                    <div key={path} className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/10 border border-border/20 text-xs">
                      <code className="font-mono text-foreground/80">{path}</code>
                      <span className="text-muted-foreground/50">→</span>
                      <span className="text-muted-foreground">{req}</span>
                      <span className="text-muted-foreground/50">→ redirect</span>
                      <code className="font-mono text-red-400/80">{redirect}</code>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Utilitários de Auth</h3>
                <CodeBlock
                  title="lib/supabase/server.ts"
                  code={`// Client singleton por request (React cache)
export const createClient = cache(async () => { ... })

// User getter cacheado
export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user || null
})

// lib/auth/roles.ts
export function resolveUserRole(profileRole, user): 'admin' | 'vendedor' | 'cliente'
export function isAdmin(role): boolean
export function isVendedor(role): boolean`}
                />
              </div>
            </GlassCard>
          </section>

          {/* ═══════════════════════════════════════════════
              6. APIs & INTEGRAÇÕES
          ═══════════════════════════════════════════════ */}
          <section id="apis-integracoes" className="scroll-mt-8">
            <GlassCard className="p-8 space-y-8">
              <SectionHeader
                icon={Plug}
                title="APIs & Integrações"
                description="Rotas internas e serviços externos"
              />

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Rotas Internas (/api)</h3>
                <div className="space-y-3">
                  {[
                    {
                      group: 'Chat',
                      routes: ['/api/chat', '/api/chat/[id]', '/api/upload'],
                      desc: 'Streaming de chat com AI SDK, upload de arquivos',
                    },
                    {
                      group: 'Cursos',
                      routes: ['/api/courses/*', '/api/lessons/*'],
                      desc: 'Dados de cursos, aulas e progresso',
                    },
                    {
                      group: 'Research',
                      routes: ['/api/research'],
                      desc: 'Agente de pesquisa via Perplexity Sonar',
                    },
                    {
                      group: 'Webhooks',
                      routes: ['/api/webhook/cakto'],
                      desc: 'Processamento de pagamentos Cakto',
                    },
                    {
                      group: 'Cron',
                      routes: ['/api/cron/notifications'],
                      desc: 'Notificações diárias às 9h (Vercel Cron)',
                    },
                    {
                      group: 'Health',
                      routes: ['/api/health'],
                      desc: 'Health check do sistema',
                    },
                  ].map(({ group, routes, desc }) => (
                    <div key={group} className="flex gap-4 px-4 py-3 rounded-xl border border-border/20 bg-muted/5">
                      <div className="w-20 shrink-0 text-xs font-semibold text-primary">{group}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          {routes.map((r) => (
                            <code key={r} className="text-[10px] font-mono bg-muted/40 px-1.5 py-0.5 rounded text-foreground/70">{r}</code>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Serviços Externos</h3>
                <TableWrapper>
                  <thead>
                    <tr>
                      <Th>Serviço</Th>
                      <Th>Uso</Th>
                      <Th>Env Var</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['OpenAI', 'Chat, análise de imagens, geração de conteúdo', 'OPENAI_API_KEY'],
                      ['OpenRouter', 'Fallback LLM + modelos alternativos', 'OPENROUTER_API_KEY'],
                      ['Perplexity', 'Research agent (busca web em tempo real)', 'PERPLEXITY_API_KEY'],
                      ['Supabase', 'Database, Auth, Storage', 'NEXT_PUBLIC_SUPABASE_URL + ANON_KEY'],
                      ['Bunny CDN', 'Streaming de vídeos educacionais', 'BUNNY_ACCESS_KEY'],
                      ['Vercel Blob', 'Upload de arquivos genéricos', 'BLOB_READ_WRITE_TOKEN'],
                      ['Cakto', 'Processamento de pagamentos', 'CAKTO_WEBHOOK_SECRET'],
                      ['Sentry', 'Error tracking e performance monitoring', 'SENTRY_DSN'],
                      ['Resend', 'Envio de emails transacionais', 'RESEND_API_KEY'],
                    ].map(([service, use, envVar]) => (
                      <tr key={service}>
                        <Td><span className="font-medium">{service}</span></Td>
                        <Td>{use}</Td>
                        <Td mono>{envVar}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrapper>
              </div>
            </GlassCard>
          </section>

          {/* ═══════════════════════════════════════════════
              7. AMBIENTE DE DEV
          ═══════════════════════════════════════════════ */}
          <section id="ambiente-dev" className="scroll-mt-8">
            <GlassCard className="p-8 space-y-8">
              <SectionHeader
                icon={Terminal}
                title="Ambiente de Desenvolvimento"
                description="Scripts, env vars e configuração local"
              />

              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Desenvolvimento</h3>
                  <CodeBlock
                    title="package.json — scripts de dev"
                    code={`npm run dev          # Dev server (Next.js)
npm run build        # Build de produção
npm run start        # Start do servidor buildado
npm run lint         # ESLint check`}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Testes</h3>
                  <CodeBlock
                    title="package.json — scripts de teste"
                    code={`npm run test         # Unit tests (Jest)
npm run test:e2e     # Playwright E2E (Chrome + iPhone 12)
npm run test:bunny   # Validação Bunny CDN`}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Database</h3>
                  <CodeBlock
                    title="package.json — scripts de database"
                    code={`npm run db:push      # Push schema para Supabase
npm run db:diff      # Mostrar diff de schema
npm run db:reset     # Reset banco local
npm run db:status    # Status das migrations`}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Env Vars Necessárias</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      'NEXT_PUBLIC_SUPABASE_URL',
                      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
                      'SUPABASE_SERVICE_ROLE_KEY',
                      'OPENAI_API_KEY',
                      'OPENROUTER_API_KEY',
                      'PERPLEXITY_API_KEY',
                      'BUNNY_ACCESS_KEY',
                      'BUNNY_LIBRARY_ID',
                      'BLOB_READ_WRITE_TOKEN',
                      'SENTRY_DSN',
                      'RESEND_API_KEY',
                      'CAKTO_WEBHOOK_SECRET',
                    ].map((envVar) => (
                      <code key={envVar} className="text-[11px] font-mono px-3 py-2 rounded-lg bg-muted/20 border border-border/20 text-foreground/70 truncate block">
                        {envVar}
                      </code>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Copie <code className="bg-muted/40 px-1 rounded font-mono">.env.example</code> para <code className="bg-muted/40 px-1 rounded font-mono">.env.local</code> e preencha os valores. Use <code className="bg-muted/40 px-1 rounded font-mono">npm run validate:env</code> para validar.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Cron Job (Vercel)</h3>
                  <CodeBlock
                    title="vercel.json"
                    code={`{
  "crons": [
    { "path": "/api/cron/notifications", "schedule": "0 9 * * *" }
  ]
}`}
                  />
                </div>
              </div>
            </GlassCard>
          </section>

          {/* ═══════════════════════════════════════════════
              8. DEPLOY & PRODUÇÃO
          ═══════════════════════════════════════════════ */}
          <section id="deploy" className="scroll-mt-8">
            <GlassCard className="p-8 space-y-8">
              <SectionHeader
                icon={Rocket}
                title="Deploy & Produção"
                description="Vercel, configurações e monitoramento"
              />

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Configurações Críticas</h3>
                <CodeBlock
                  title="next.config.mjs — configurações chave"
                  code={`// Output standalone (containerização Vercel)
output: 'standalone'

// Body limit 100MB (reduzido de 2GB para evitar OOM)
serverActions: { bodySizeLimit: '100mb' }

// Source maps desabilitados em produção
productionBrowserSourceMaps: false

// Integração Sentry com Vercel Cron Monitors
// Sentry tree-shaking ativo`}
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Monitoramento</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: CheckCircle2, name: 'Sentry', desc: 'Error tracking, performance monitoring, session replays', color: 'text-violet-400' },
                    { icon: TrendingUp, name: 'Vercel Analytics', desc: 'Page views, vitals, performance metrics em produção', color: 'text-blue-400' },
                    { icon: Clock, name: 'Vercel Cron', desc: 'Notificações diárias às 9h monitoradas pelo Sentry', color: 'text-cyan-400' },
                  ].map(({ icon: Icon, name, desc, color }) => (
                    <div key={name} className="px-4 py-4 rounded-xl border border-border/30 bg-muted/5 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${color}`} />
                        <span className="text-sm font-medium text-foreground">{name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Deploy Checklist</h3>
                <div className="space-y-2">
                  {[
                    'Todas as env vars configuradas no painel Vercel',
                    'Migrations rodadas no Supabase production',
                    'Webhooks Cakto apontando para URL de produção',
                    'Bunny CDN configurado com domínio correto',
                    'Sentry DSN de produção configurado',
                    'Cron job de notificações ativo no Vercel',
                    'RLS policies ativas no Supabase',
                    'Build passou sem erros TypeScript',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500/50 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Otimizações de Performance</h3>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {[
                    'Tree-shaking ativado (incluindo Sentry)',
                    'Dynamic imports + React.lazy + Suspense para code splitting',
                    'SWR 2.3.8 para data fetching com caching automático',
                    'Imagens: formatos dinâmicos AVIF/WebP + lazy loading',
                    'Full-text search no PostgreSQL (índices otimizados)',
                    'Standalone output mode para containerização eficiente',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-primary/50 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </GlassCard>
          </section>

          {/* Footer */}
          <div className="pb-8 text-center text-xs text-muted-foreground/40">
            MedVision — Documentação Técnica Interna · v0.1.4 · Sincronizado em Jan 2026
          </div>

        </main>
      </div>
    </div>
  )
}
