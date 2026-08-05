"use client"

import { useIsClient } from "@/lib/hooks/use-mobile"
import { getRemainingTrialDays, isTrialActive } from "@/lib/trial"
import { Crown, AlertTriangle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

import { SubscriptionModal } from "./subscription-modal"

interface TrialCountdownBannerProps {
  trialEndsAt: string | null | undefined
  planType: string | null | undefined
}

export function TrialCountdownBanner({ trialEndsAt, planType }: TrialCountdownBannerProps) {
  const mounted = useIsClient()

  if (!mounted) return null
  
  // Se o usuário já tem plano pago ou não tem data de término de trial, não mostra banner
  if ((planType && planType !== "free") || !trialEndsAt) {
    return null
  }

  // Se o trial não está ativo (já expirou ou não começou), não mostra este banner
  // (para trial expirado, teremos o bloqueio ou outra UI)
  if (!isTrialActive(trialEndsAt)) {
    return null
  }

  const daysRemaining = getRemainingTrialDays(trialEndsAt)
  const isUrgent = daysRemaining <= 3
  const isLastDay = daysRemaining === 0

  return (
    <div className={cn(
      "w-full px-4 py-3 flex items-center justify-center gap-4 text-sm font-medium transition-all",
      isLastDay 
        ? "bg-red-500/10 text-red-500 border-b border-red-500/20" 
        : isUrgent 
          ? "bg-amber-500/10 text-amber-500 border-b border-amber-500/20" 
          : "bg-emerald-500/10 text-emerald-500 border-b border-emerald-500/20"
    )}>
      <div className="flex items-center gap-2">
        {isLastDay ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
        <span>
          {isLastDay 
            ? "Último dia do seu período gratuito!" 
            : `Você tem ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''} restante${daysRemaining !== 1 ? 's' : ''} de acesso gratuito.`}
        </span>
      </div>

      <SubscriptionModal
        trigger={
          <button 
            className={cn(
              "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 whitespace-nowrap flex-shrink-0",
              isLastDay 
                ? "bg-red-500 text-white hover:bg-red-600 shadow-sm" 
                : isUrgent
                  ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                  : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
            )}
          >
            <Crown className="h-3 w-3" />
            Assinar Agora
          </button>
        }
      />
    </div>
  )
}

