'use client'

/**
 * Botão flutuante de suporte com painel de chat → WhatsApp do Marcos.
 * Envia via /api/support/chat (deep link wa.me + notificação Uazapi se configurada).
 */

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Headphones, Loader2, MessageCircle, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useDashboardUser } from '@/lib/contexts/dashboard-user-context'

const QUICK_PROMPTS = [
  'Preciso de ajuda com a análise de imagem',
  'Erro ao gerar laudo',
  'Dúvida sobre plano / acesso',
  'Falar com o Marcos',
] as const

const FALLBACK_PHONE =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_E164?.replace(/\D/g, '') ||
  '558486174829'

type ChatLine = {
  id: string
  role: 'bot' | 'user' | 'system'
  text: string
}

export function SupportChatWidget({ className }: { className?: string }) {
  const pathname = usePathname()
  const { user } = useDashboardUser()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [lines, setLines] = useState<ChatLine[]>(() => [
    {
      id: 'hello',
      role: 'bot',
      text: 'Oi! Sou o suporte do MedVision. Escreva sua dúvida que eu te levo pro WhatsApp do Marcos.',
    },
  ])

  const greetingName = useMemo(() => {
    const n = user?.name?.trim()
    if (!n) return null
    return n.split(/\s+/)[0]
  }, [user?.name])

  useEffect(() => {
    if (!open || !greetingName) return
    setLines((prev) => {
      if (prev.some((l) => l.id === 'hello-named')) return prev
      return [
        {
          id: 'hello-named',
          role: 'bot',
          text: `Olá, ${greetingName}! Pode mandar a mensagem — abro o WhatsApp com o contexto da sua conta.`,
        },
        ...prev.filter((l) => l.id !== 'hello'),
      ]
    })
  }, [open, greetingName])

  async function sendMessage(raw: string) {
    const message = raw.trim()
    if (message.length < 3 || sending) return

    setSending(true)
    setLines((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: message },
    ])
    setDraft('')

    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          pagePath: pathname || null,
          notifyApi: true,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        waLink?: string
        apiNotify?: { ok?: boolean }
        error?: string
      }

      const waLink =
        data.waLink ||
        `https://wa.me/${FALLBACK_PHONE}?text=${encodeURIComponent(message)}`

      const apiOk = data.apiNotify?.ok === true
      setLines((prev) => [
        ...prev,
        {
          id: `s-${Date.now()}`,
          role: 'system',
          text: apiOk
            ? 'Mensagem registrada. Abrindo o WhatsApp do Marcos…'
            : 'Abrindo o WhatsApp do Marcos com sua mensagem…',
        },
      ])

      window.open(waLink, '_blank', 'noopener,noreferrer')
    } catch {
      const fallback = `https://wa.me/${FALLBACK_PHONE}?text=${encodeURIComponent(
        message,
      )}`
      setLines((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'system',
          text: 'Não consegui falar com o servidor; abrindo WhatsApp direto.',
        },
      ])
      window.open(fallback, '_blank', 'noopener,noreferrer')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className={cn(
        'pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3',
        'pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      {open && (
        <div
          className={cn(
            'pointer-events-auto flex w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl',
            'h-[min(70vh,28rem)]',
          )}
          role="dialog"
          aria-label="Chat de suporte MedVision"
        >
          <div className="flex items-center justify-between gap-2 border-b bg-[linear-gradient(135deg,#128C7E_0%,#25D366_100%)] px-3 py-2.5 text-white">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-white/15">
                <Headphones className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Suporte MedVision</p>
                <p className="truncate text-[11px] text-white/85">WhatsApp · Marcos</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 hover:bg-white/15"
              aria-label="Fechar suporte"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-3">
            {lines.map((line) => (
              <div
                key={line.id}
                className={cn(
                  'max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-snug',
                  line.role === 'user' &&
                    'ml-auto bg-[#DCF8C6] text-ink shadow-sm',
                  line.role === 'bot' && 'mr-auto bg-background border shadow-sm',
                  line.role === 'system' &&
                    'mx-auto max-w-full bg-transparent text-center text-xs text-muted-foreground',
                )}
              >
                {line.text}
              </div>
            ))}

            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={sending}
                  onClick={() => void sendMessage(q)}
                  className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-foreground/80 hover:border-emerald-500/40 hover:text-emerald-700 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <form
            className="flex items-end gap-2 border-t bg-background p-2.5"
            onSubmit={(e) => {
              e.preventDefault()
              void sendMessage(draft)
            }}
          >
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escreva sua mensagem…"
              rows={2}
              disabled={sending}
              className="min-h-[44px] resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendMessage(draft)
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || draft.trim().length < 3}
              className="shrink-0 bg-[#25D366] text-white hover:bg-[#1ebe5d]"
              aria-label="Enviar suporte"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
        </div>
      )}

      <Button
        type="button"
        size="lg"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'pointer-events-auto h-12 gap-2 rounded-full px-4 shadow-lg',
          'bg-[#25D366] text-white hover:bg-[#1ebe5d]',
        )}
        aria-expanded={open}
        aria-label={open ? 'Fechar suporte' : 'Abrir suporte no WhatsApp'}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
        <span className="text-sm font-semibold">Suporte</span>
      </Button>
    </div>
  )
}
