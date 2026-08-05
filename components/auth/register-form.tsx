"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Sparkles, ArrowRight } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { bootstrapProfileAfterSignup } from "@/app/actions/register-bootstrap"
import { DEFAULT_ROLE, resolveUserRole } from "@/lib/auth/roles"
import { DEFAULT_TRIAL_DAYS, normalizeTrialDays } from "@/lib/trial"
import { createClient } from "@/lib/supabase/client"
import { CAKTO_BASIC_ANNUAL_PLAN_ID, CAKTO_PRO_ANNUAL_PLAN_ID } from "@/lib/cakto"

type RegisterFormProps = {
  trialDays?: number
}

// Mapeamento de planos para IDs da Cakto
const PLAN_CHECKOUT_MAP: Record<string, { id: string; name: string }> = {
  basic: { id: CAKTO_BASIC_ANNUAL_PLAN_ID, name: "Plano Basico Anual" },
  pro: { id: CAKTO_PRO_ANNUAL_PLAN_ID, name: "Plano Pro Anual" },
}

export function RegisterForm({ trialDays = DEFAULT_TRIAL_DAYS }: RegisterFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [occupation, setOccupation] = useState("")
  const [institution, setInstitution] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const normalizedTrialDays = normalizeTrialDays(trialDays)
  const trialLabel = `${normalizedTrialDays} dia${normalizedTrialDays > 1 ? "s" : ""}`

  // Verificar se veio de um plano específico
  const planParam = searchParams.get('plan')
  const selectedPlan = planParam && PLAN_CHECKOUT_MAP[planParam] ? PLAN_CHECKOUT_MAP[planParam] : null
  const isCheckoutFlow = !!selectedPlan

  // Pré-preencher campos com dados da landing page (ajuste de estado durante o render)
  const [prevParams, setPrevParams] = useState(searchParams)
  if (prevParams !== searchParams) {
    setPrevParams(searchParams)
    const emailParam = searchParams.get('email')
    const whatsappParam = searchParams.get('whatsapp')

    if (emailParam) setEmail(emailParam)
    if (whatsappParam) setWhatsapp(whatsappParam)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    // Validação de senha
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.")
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.")
      setIsLoading(false)
      return
    }

    if (!whatsapp) {
      setError("O WhatsApp é obrigatório.")
      setIsLoading(false)
      return
    }

    if (!occupation) {
      setError("Selecione sua ocupação.")
      setIsLoading(false)
      return
    }

    if (occupation === "Estudante" && !institution) {
      setError("Informe sua instituição de ensino.")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            whatsapp,
            profession: occupation,
            institution: occupation === "Estudante" ? institution : null,
            role: DEFAULT_ROLE,
            trial_days: normalizedTrialDays,
            trial_form: `${normalizedTrialDays}d`,
          },
        },
      })

      if (signUpError) {
        console.error("Registration error:", signUpError)

        // Mensagens de erro em português
        if (signUpError.message.includes("already registered")) {
          setError("Este email já está cadastrado. Tente fazer login.")
        } else if (signUpError.message.includes("Password should be")) {
          setError("A senha deve ter pelo menos 8 caracteres.")
        } else if (signUpError.message.includes("valid email")) {
          setError("Por favor, insira um email válido.")
        } else {
          setError("Erro ao criar conta. Por favor, tente novamente.")
        }
        setIsLoading(false)
        return
      }

      if (data.user) {
        // Cadastro bem-sucedido
        setSuccess(true)

        const boot = await bootstrapProfileAfterSignup({
          name,
          email,
          whatsapp,
          profession: occupation,
          institution: occupation === "Estudante" ? institution : null,
          trialDays: normalizedTrialDays,
        })
        if (boot.error) {
          console.warn("[auth] bootstrap perfil:", boot.error)
        }

        // Se o email foi confirmado automaticamente (depende da configuração do Neon Auth)
        if (data.user.email_confirmed_at || data.session) {
          // Se veio de um plano, redirecionar para o checkout da Cakto
          if (isCheckoutFlow && selectedPlan) {
            const checkoutUrl = `https://pay.cakto.com.br/${selectedPlan.id}?email=${encodeURIComponent(email)}`
            setTimeout(() => {
              window.location.href = checkoutUrl
            }, 1500)
          } else {
            // Fluxo normal: ir para o dashboard
            let profileRow: { role?: string } | null = null
            try {
              const res = await fetch("/api/profile/self", { credentials: "include" })
              if (res.ok) profileRow = await res.json()
            } catch (e) {
              console.warn("[auth] Could not load profile role after signup", e)
            }

            const resolvedRole = resolveUserRole(profileRow?.role, data.user)
            const destination = resolvedRole === "admin" ? "/admin" : "/dashboard"

            setTimeout(() => {
              router.replace(destination)
            }, 2000)
          }
        } else {
          // Se veio de um plano mas precisa confirmar email, salvar o plano em localStorage
          if (isCheckoutFlow && selectedPlan) {
            localStorage.setItem('pendingCheckout', JSON.stringify({
              planId: selectedPlan.id,
              email: email
            }))
          }
          // Mostrar mensagem de confirmação de email
          setTimeout(() => {
            router.push("/login?message=confirm-email")
          }, 3000)
        }
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      setError("Erro inesperado. Por favor, tente novamente.")
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Banner - Checkout ou Trial */}
      {isCheckoutFlow && selectedPlan ? (
        <div className="rounded-xl border border-signal/30 bg-signal/5 p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-signal/10 p-2">
              <Sparkles className="h-4 w-4 text-signal" />
            </div>
            <div>
              <p className="text-sm font-semibold text-signal">
                {selectedPlan.name}
              </p>
              <p className="text-xs text-ink-muted">
                Crie sua conta para finalizar a compra
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-signal/30 bg-signal/5 p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-signal/10 p-2">
              <Sparkles className="h-4 w-4 text-signal" />
            </div>
            <div>
              <p className="text-sm font-semibold text-signal">
                {trialLabel} de acesso gratuito
              </p>
              <p className="text-xs text-ink-muted">
                Sem cartão de crédito. Acesso completo imediato.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <Alert
          variant="destructive"
          className="border-red-200 bg-red-50 text-red-800 [&>svg]:text-red-600"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800 [&>svg]:text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {isCheckoutFlow
              ? "Conta criada! Redirecionando para o pagamento..."
              : "Conta criada com sucesso! Verifique seu email para confirmar o cadastro."
            }
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-ink">
          Nome Completo
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="Dr. João Silva"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isLoading || success}
          className="h-12 rounded-xl border-border bg-surface px-4 text-foreground placeholder:text-muted-foreground focus:border-signal focus:ring-signal/20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-ink">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading || success}
          className="h-12 rounded-xl border-border bg-surface px-4 text-foreground placeholder:text-muted-foreground focus:border-signal focus:ring-signal/20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp" className="text-sm font-medium text-ink">
          WhatsApp
        </Label>
        <Input
          id="whatsapp"
          type="tel"
          placeholder="(11) 99999-9999"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          required
          disabled={isLoading || success}
          className="h-12 rounded-xl border-border bg-surface px-4 text-foreground placeholder:text-muted-foreground focus:border-signal focus:ring-signal/20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="occupation" className="text-sm font-medium text-ink">
          Ocupação
        </Label>
        <Select
          value={occupation}
          onValueChange={setOccupation}
          disabled={isLoading || success}
          required
        >
          <SelectTrigger className="h-12 rounded-xl border-border bg-surface px-4 text-foreground focus:border-signal focus:ring-signal/20">
            <SelectValue placeholder="Selecione sua ocupação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Cirurgião-Dentista">Cirurgião-Dentista</SelectItem>
            <SelectItem value="Médico">Médico</SelectItem>
            <SelectItem value="Estudante">Estudante</SelectItem>
            <SelectItem value="Empresário">Empresário</SelectItem>
            <SelectItem value="Outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {occupation === "Estudante" && (
        <div className="space-y-2">
          <Label htmlFor="institution" className="text-sm font-medium text-ink">
            Instituição de Ensino
          </Label>
          <Input
            id="institution"
            type="text"
            placeholder="Nome da Universidade/Faculdade"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            required
            disabled={isLoading || success}
            className="h-12 rounded-xl border-border bg-surface px-4 text-foreground placeholder:text-muted-foreground focus:border-signal focus:ring-signal/20"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-ink">
          Senha
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={isLoading || success}
            className="h-12 rounded-xl border-border bg-surface px-4 pr-12 text-foreground placeholder:text-muted-foreground focus:border-signal focus:ring-signal/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading || success}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-ink">
          Confirmar Senha
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Digite a senha novamente"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            disabled={isLoading || success}
            className="h-12 rounded-xl border-border bg-surface px-4 pr-12 text-foreground placeholder:text-muted-foreground focus:border-signal focus:ring-signal/20"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={isLoading || success}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
            aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || success}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-signal font-semibold text-surface-raised transition-colors hover:bg-signal/90 focus-visible:ring-2 focus-visible:ring-signal/30 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Criando conta...
          </>
        ) : success ? (
          <>
            <CheckCircle2 className="h-5 w-5" />
            {isCheckoutFlow ? "Redirecionando para pagamento..." : "Conta criada!"}
          </>
        ) : (
          <>
            {isCheckoutFlow ? "Criar conta e continuar" : `Começar teste de ${trialLabel}`}
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>
    </form>
  )
}
