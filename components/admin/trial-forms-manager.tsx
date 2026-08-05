"use client"

import { useMemo, useState } from "react"
import { Copy, Link2, ShieldCheck, Sparkles } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DEFAULT_TRIAL_DAYS, TRIAL_OPTIONS } from "@/lib/trial"

type FormLink = {
  id: string
  title: string
  description: string
  path: string
  days: number
  isDefault?: boolean
}

const baseEnvUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")

export function TrialFormsManager() {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [origin] = useState<string>(() => {
    if (typeof window === "undefined") return ""
    return window.location.origin
  })

  const baseUrl = origin || baseEnvUrl

  const forms: FormLink[] = useMemo(() => {
    return [
      {
        id: "lp-default",
        title: "Cadastro padrão (LP)",
        description: `Fluxo padrão da landing page com ${DEFAULT_TRIAL_DAYS} dias de trial.`,
        path: "/register",
        days: DEFAULT_TRIAL_DAYS,
        isDefault: true,
      },
      ...TRIAL_OPTIONS.map((days) => ({
        id: `trial-${days}`,
        title: `${days} dia${days !== 1 ? "s" : ""} de trial`,
        description:
          days === DEFAULT_TRIAL_DAYS
            ? "Formulário dedicado mantendo o padrão da landing."
            : `Cadastro específico para liberar ${days} dia${days !== 1 ? "s" : ""}.`,
        path: `/register/trial/${days}`,
        days,
      })),
    ]
  }, [])

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error("Erro ao copiar link de trial", error)
    }
  }

  const getFullUrl = (path: string) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`
    return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath
  }

  return (
    <div className="space-y-4">
      <Alert className="bg-cyan-500/10 border-cyan-500/40 text-cyan-50">
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          Trials disponíveis em 1, 3, 7 e 30 dias. O link padrão da landing permanece com {DEFAULT_TRIAL_DAYS} dias e usuários premium não devem receber novos trials.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {forms.map((form) => {
          const fullUrl = getFullUrl(form.path)
          const isCopied = copiedId === form.id

          return (
            <Card key={form.id} className="bg-[#0F192F] border-slate-700">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-cyan-400" />
                    {form.title}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {form.description}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                    {form.days} dia{form.days !== 1 ? "s" : ""}
                  </Badge>
                  {form.isDefault && (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
                      Padrão LP
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Compartilhe apenas com quem ainda não é premium.
                  </p>
                  <Input readOnly value={fullUrl} className="bg-[#131D37] border-slate-600 text-white" />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => handleCopy(fullUrl, form.id)}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {isCopied ? "Copiado" : "Copiar link"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-600 text-slate-200 hover:text-white"
                    asChild
                  >
                    <a href={fullUrl} target="_blank" rel="noreferrer">
                      Abrir formulário
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
