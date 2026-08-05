"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CheckCircle, XCircle, Clock, Filter, Search } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { NotificationLog } from "./types"

interface NotificationHistoryProps {
  logs: NotificationLog[]
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 shadow"
          : "border-slate-700 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-100"
      )}
    >
      {label}
    </button>
  )
}

export function NotificationHistory({ logs }: NotificationHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed" | "pending">("all")
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "email">("all")
  const [searchTerm, setSearchTerm] = useState("")

  const stats = useMemo(() => {
    return logs.reduce(
      (acc, log) => {
        acc.total += 1
        if (log.status === "sent") acc.sent += 1
        if (log.status === "failed") acc.failed += 1
        if (log.status === "pending") acc.pending += 1
        if (log.channel === "whatsapp") acc.whatsapp += 1
        if (log.channel === "email") acc.email += 1
        return acc
      },
      { total: 0, sent: 0, failed: 0, pending: 0, whatsapp: 0, email: 0 }
    )
  }, [logs])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const statusMatch = statusFilter === "all" || log.status === statusFilter
      const channelMatch = channelFilter === "all" || log.channel === channelFilter
      const normalizedSearch = searchTerm.trim().toLowerCase()

      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          log.profiles?.name,
          log.profiles?.email,
          log.profiles?.whatsapp,
          log.notification_templates?.name,
          log.content,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedSearch))

      return statusMatch && channelMatch && matchesSearch
    })
  }, [channelFilter, logs, searchTerm, statusFilter])

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-white">Histórico de Envios</CardTitle>
            <p className="text-sm text-slate-400">Filtre por status, canal ou palavra-chave para achar rapidamente.</p>
          </div>
          <Badge variant="outline" className="border-slate-700 text-slate-300 bg-slate-800/70">
            Últimos {logs.length} registros
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[2fr,1fr]">
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill label={`Todos (${stats.total})`} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
            <FilterPill label={`Enviados (${stats.sent})`} active={statusFilter === "sent"} onClick={() => setStatusFilter("sent")} />
            <FilterPill label={`Pendentes (${stats.pending})`} active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")} />
            <FilterPill label={`Falhas (${stats.failed})`} active={statusFilter === "failed"} onClick={() => setStatusFilter("failed")} />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <FilterPill label={`WhatsApp (${stats.whatsapp})`} active={channelFilter === "whatsapp"} onClick={() => setChannelFilter(channelFilter === "whatsapp" ? "all" : "whatsapp")} />
            <FilterPill label={`Email (${stats.email})`} active={channelFilter === "email"} onClick={() => setChannelFilter(channelFilter === "email" ? "all" : "email")} />
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, telefone, template ou conteúdo"
              className="pl-9 bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="h-4 w-4" />
            <span>Filtros aplicados: {statusFilter !== "all" ? statusFilter : "todos"} / {channelFilter !== "all" ? channelFilter : "canais"}</span>
          </div>
        </div>

        <div className="rounded-md border border-slate-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-800/50">
                <TableHead className="text-slate-400">Data</TableHead>
                <TableHead className="text-slate-400">Usuário</TableHead>
                <TableHead className="text-slate-400">Canal</TableHead>
                <TableHead className="text-slate-400">Template / Conteúdo</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow className="border-slate-700">
                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                    Nenhuma notificação encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="border-slate-700 hover:bg-slate-800/50">
                    <TableCell className="font-medium text-slate-300 whitespace-nowrap">
                      {format(new Date(log.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      <div className="flex flex-col">
                        <span>{log.profiles?.name || "Usuário"}</span>
                        <span className="text-xs text-slate-500">{log.profiles?.whatsapp || log.profiles?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300 capitalize">
                      <Badge variant="outline" className="border-slate-700 bg-slate-800/70 text-slate-200">
                        {log.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-slate-300" title={log.content}>
                      {log.notification_templates?.name ? (
                        <Badge variant="outline" className="mr-2 border-slate-600 text-slate-400">
                          {log.notification_templates.name}
                        </Badge>
                      ) : null}
                      <span className="text-sm text-slate-400">{log.content}</span>
                    </TableCell>
                    <TableCell>
                      {log.status === "sent" && (
                        <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">
                          <CheckCircle className="mr-1 h-3 w-3" /> Enviado
                        </Badge>
                      )}
                      {log.status === "failed" && (
                        <div className="space-y-1">
                          <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">
                            <XCircle className="mr-1 h-3 w-3" /> Falhou
                          </Badge>
                          {log.error_message ? (
                            <p className="text-[11px] text-red-300/80 max-w-[240px] line-clamp-2" title={log.error_message}>
                              {log.error_message}
                            </p>
                          ) : null}
                        </div>
                      )}
                      {log.status === "pending" && (
                        <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">
                          <Clock className="mr-1 h-3 w-3" /> Pendente
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}











