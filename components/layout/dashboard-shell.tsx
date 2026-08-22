'use client'

/**
 * Dashboard Shell - Client wrapper for dashboard pages
 *
 * Mobile:
 * - Header fixo com toggle da sidebar (sem dock inferior que cobria ações)
 * - Padding-top para o header + safe-area
 *
 * Scroll System:
 * - SidebarInset (pai) gerencia overflow-y-auto em todos os breakpoints
 * - DashboardShell usa min-h-0 flex-1 para crescer com conteúdo
 * - Chat/Biblioteca usam h-full overflow-hidden com scroll interno
 */

import { MobileFloatingHeader } from '@/components/mobile/mobile-floating-header'
import { SupportChatWidget } from '@/components/support/support-chat-widget'
import { useDashboardUser } from '@/lib/contexts/dashboard-user-context'
import { useIsMobile } from '@/lib/hooks/use-mobile'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface DashboardShellProps {
  children: React.ReactNode
  className?: string
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const { user } = useDashboardUser()

  // Detecta páginas que precisam de altura total (chat, biblioteca)
  const isChat = pathname?.includes('/chat')
  const needsFullHeight = isChat || pathname?.includes('/biblioteca')

  return (
    <div
      data-surface="product"
      className={cn(
        'flex flex-col bg-void min-h-0',
        needsFullHeight ? 'h-full overflow-hidden' : 'flex-1',
        className
      )}
    >
      {isMobile && (
        <MobileFloatingHeader
          userName={user?.name ?? undefined}
          userImage={user?.avatar_url ?? undefined}
        />
      )}
      <div
        className={cn(
          'flex flex-col flex-1 min-h-0',
          isMobile &&
            !isChat &&
            'pt-[calc(52px+env(safe-area-inset-top))]'
        )}
      >
        {children}
      </div>
      <SupportChatWidget />
    </div>
  )
}
