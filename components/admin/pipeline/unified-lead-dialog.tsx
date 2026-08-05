"use client"

import { useEffect, useState, useTransition } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock3,
  ExternalLink,
  GraduationCap,
  History,
  LinkIcon,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Send,
  Trash2,
  User,
  UserCheck,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getRemainingTrialDays } from "@/lib/trial"

// Server actions
import { getLeadDetails as getColdLeadDetails, addLeadNote, deleteLeadNote } from "@/app/actions/leads"
import { getLeadDetails as getProfileDetails, getLinkedLead, updatePipelineStage, assignLeadToSeller } from "@/app/actions/pipeline"
import { SellerAssignmentSelect } from "./seller-assignment-select"

export type UnifiedLeadDialogType = "cold_lead" | "profile"

interface UnifiedLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: UnifiedLeadDialogType
  id: string
  name?: string | null
  onStageChange?: () => void
}

export function UnifiedLeadDialog({
  open,
  onOpenChange,
  type,
  id,
  name,
  onStageChange,
}: UnifiedLeadDialogProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [data, setData] = useState<any>(null)
  const [linkedData, setLinkedData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState("")
  const [isAddingNote, startNoteTransition] = useTransition()
  const [isDeletingNote, setIsDeletingNote] = useState<string | null>(null)

  const isColdLead = type === "cold_lead"

  useEffect(() => {
    if (open && id) {
      loadData()
    }
  }, [open, id, type])

  const loadData = async () => {
    setLoading(true)
    try {
      if (isColdLead) {
        const result = await getColdLeadDetails(id)
        if (result.success) {
          setData(result.data)
        }
      } else {
        const result = await getProfileDetails(id)
        if (result.success) {
          setData(result.data)
          // Also load linked cold lead
          const linkedResult = await getLinkedLead(id)
          if (linkedResult.success && linkedResult.data) {
            setLinkedData(linkedResult.data)
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return

    startNoteTransition(async () => {
      const result = isColdLead
        ? await addLeadNote(id, newNote.trim())
        : null // Profile notes handled separately

      if (result?.success || !isColdLead) {
        setNewNote("")
        loadData()
        onStageChange?.()
      }
    })
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Excluir esta nota?")) return

    setIsDeletingNote(noteId)
    try {
      await deleteLeadNote(noteId)
      loadData()
      onStageChange?.()
    } catch (error) {
      console.error("Erro ao excluir nota:", error)
    } finally {
      setIsDeletingNote(null)
    }
  }

  const handleSellerChange = async (sellerId: string | null) => {
    if (isColdLead) {
      const { assignSellerToLead } = await import("@/app/actions/leads")
      await assignSellerToLead(id, sellerId)
    } else {
      await assignLeadToSeller(id, sellerId)
    }
    loadData()
    onStageChange?.()
  }

  if (!open) return null

  // Extract data based on type
  const lead = isColdLead ? data?.lead : null
  const profile = !isColdLead ? data?.profile : null
  const notes = data?.notes || []
  const timeline = data?.timeline || []
  const convertedProfile = isColdLead ? data?.convertedProfile : null
  const linkedLead = !isColdLead ? linkedData : null

  const entity = lead || profile || {}
  const entityName = entity.name || name || "Lead sem nome"
  const email = entity.email
  const phone = lead?.phone || profile?.whatsapp
  const createdAt = entity.created_at
  const assignedTo = entity.assigned_to

  // Profile-specific
  const trialEndsAt = profile?.trial_ends_at
  const trialStartedAt = profile?.trial_started_at
  const isPaid = profile?.plan_type && profile.plan_type !== "free"

  const daysRemaining = trialEndsAt ? Math.max(0, getRemainingTrialDays(trialEndsAt)) : null
  const isUrgent = daysRemaining !== null && daysRemaining <= 2

  const trialProgress = (() => {
    if (!trialStartedAt || !trialEndsAt) return null
    const startDate = new Date(trialStartedAt)
    const endDate = new Date(trialEndsAt)
    const now = new Date()
    const totalDuration = endDate.getTime() - startDate.getTime()
    const elapsed = now.getTime() - startDate.getTime()
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
    return Math.round(progress)
  })()

  // Cold lead specific
  const isConverted = lead?.status === "convertido"

  const phoneDigits = phone?.replace(/\D/g, "")
  const whatsappUrl = phoneDigits ? `https://wa.me/${phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`}` : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 bg-card border-border text-foreground overflow-hidden shadow-2xl sm:rounded-2xl">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex flex-col gap-4 px-6 py-5 border-b border-border bg-card/80 backdrop-blur-md">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-3 flex-wrap">
                  {entityName}
                  {isColdLead ? (
                    isConverted && (
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                        Convertido
                      </Badge>
                    )
                  ) : (
                    isPaid && (
                      <Badge className="bg-violet-500/10 text-violet-300 border-violet-500/20">
                        {profile.plan_type}
                      </Badge>
                    )
                  )}
                </DialogTitle>

                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  {email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-cyan-500" />
                      {email}
                    </span>
                  )}
                  {phone && (
                    <span className="flex items-center gap-1.5 font-mono text-xs">
                      <Phone className="h-3.5 w-3.5 text-emerald-500" />
                      {phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {whatsappUrl && (
                  <Button asChild variant="outline" size="sm" className="gap-2 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
                    <a href={whatsappUrl} target="_blank" rel="noreferrer">
                      <Phone className="h-4 w-4" />
                      WhatsApp
                    </a>
                  </Button>
                )}
                {!isColdLead && (
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <Link href={`/admin/usuarios/${id}`}>
                      <ExternalLink className="h-4 w-4" />
                      Perfil
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Trial Progress Bar (profiles only) */}
            {!isColdLead && trialProgress !== null && (
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Trial</span>
                  <span className={cn(
                    "text-xs font-bold flex items-center gap-1",
                    isUrgent ? "text-rose-400" : "text-cyan-400"
                  )}>
                    <Clock3 className="w-3 h-3" />
                    {daysRemaining === 0 ? "Expira hoje" : `${daysRemaining}d restantes`}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-700 ease-out rounded-full",
                      isUrgent
                        ? "bg-gradient-to-r from-rose-500 to-amber-500"
                        : "bg-gradient-to-r from-cyan-600 to-blue-500"
                    )}
                    style={{ width: `${trialProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Sidebar */}
              <div className="w-full md:w-[280px] border-b md:border-b-0 md:border-r border-border bg-muted/10 overflow-y-auto p-5 space-y-6 shrink-0">
                {/* Seller Assignment */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5" />
                    Vendedor
                  </h3>
                  <SellerAssignmentSelect
                    value={assignedTo}
                    onValueChange={handleSellerChange}
                    className="w-full"
                  />
                </div>

                {/* Cold Lead Info */}
                {isColdLead && lead && (
                  <>
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        Dados do Lead
                      </h3>
                      <div className="bg-card/50 rounded-lg p-4 border border-border/50 space-y-3 text-sm">
                        {lead.state && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 opacity-60" />
                            <span>{lead.state}</span>
                          </div>
                        )}
                        {lead.ies && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <GraduationCap className="h-4 w-4 opacity-60" />
                            <span className="truncate">{lead.ies}</span>
                          </div>
                        )}
                        {lead.source && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <ArrowRight className="h-4 w-4 opacity-60" />
                            <span>Origem: {lead.source}</span>
                          </div>
                        )}
                        {lead.sheet_source_name && (
                          <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                            Planilha: {lead.sheet_source_name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Converted Profile Link */}
                    {convertedProfile && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                          <LinkIcon className="h-3.5 w-3.5" />
                          Usuario Convertido
                        </h3>
                        <Link
                          href={`/admin/usuarios/${convertedProfile.id}`}
                          className="block bg-green-500/10 rounded-lg p-4 border border-green-500/20 hover:border-green-500/40 transition-colors"
                        >
                          <div className="flex items-center gap-2 text-green-400 font-medium mb-1">
                            <User className="h-4 w-4" />
                            {convertedProfile.name || convertedProfile.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Stage: {convertedProfile.pipeline_stage || "cadastro"}
                          </div>
                          {convertedProfile.trial_ends_at && (
                            <div className="text-xs text-muted-foreground">
                              Trial: {format(new Date(convertedProfile.trial_ends_at), "dd/MM/yyyy")}
                            </div>
                          )}
                        </Link>
                      </div>
                    )}
                  </>
                )}

                {/* Profile Info */}
                {!isColdLead && profile && (
                  <>
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <History className="h-3.5 w-3.5" />
                        Trial
                      </h3>
                      <div className="bg-card/50 rounded-lg p-4 border border-border/50 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Inicio</span>
                          <span className="font-mono text-xs">
                            {profile.trial_started_at
                              ? format(new Date(profile.trial_started_at), "dd/MM/yyyy")
                              : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fim</span>
                          <span className="font-mono text-xs">
                            {profile.trial_ends_at
                              ? format(new Date(profile.trial_ends_at), "dd/MM/yyyy")
                              : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-border/50">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant="outline" className={cn(
                            "text-[10px]",
                            profile.subscription_status === "active" ? "text-emerald-400 border-emerald-500/30" :
                            profile.subscription_status === "canceled" ? "text-rose-400 border-rose-500/30" :
                            "text-muted-foreground border-border"
                          )}>
                            {profile.subscription_status || "free"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Linked Lead */}
                    {linkedLead && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                          <LinkIcon className="h-3.5 w-3.5" />
                          Lead de Origem
                        </h3>
                        <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-500/20">
                          <div className="flex items-center gap-2 text-cyan-400 font-medium mb-1">
                            <User className="h-4 w-4" />
                            {linkedLead.name || linkedLead.phone}
                          </div>
                          {linkedLead.source && (
                            <div className="text-xs text-muted-foreground">
                              Origem: {linkedLead.source}
                            </div>
                          )}
                          {linkedLead.created_at && (
                            <div className="text-xs text-muted-foreground">
                              Importado: {format(new Date(linkedLead.created_at), "dd/MM/yyyy")}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Created At */}
                <div className="text-xs text-muted-foreground pt-4 border-t border-border/50">
                  Criado {createdAt ? formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ptBR }) : "-"}
                </div>
              </div>

              {/* Right Content - Tabs */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <div className="px-6 pt-4 border-b border-border/50">
                    <TabsList className="bg-transparent h-auto p-0 gap-6">
                      <TabsTrigger
                        value="overview"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 text-muted-foreground data-[state=active]:text-primary font-medium"
                      >
                        <History className="w-4 h-4 mr-2" />
                        Timeline
                      </TabsTrigger>
                      <TabsTrigger
                        value="notes"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 text-muted-foreground data-[state=active]:text-primary font-medium"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Notas ({notes.length})
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    {/* Timeline Tab */}
                    <TabsContent value="overview" className="h-full m-0 data-[state=active]:flex flex-col">
                      <ScrollArea className="flex-1 h-full">
                        <div className="p-6 space-y-4">
                          {timeline.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                              <History className="h-8 w-8 mb-2 opacity-40" />
                              <p className="text-sm">Nenhum evento registrado</p>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                              {timeline.map((event: any, index: number) => (
                                <div key={event.id} className="relative pl-10 pb-6 last:pb-0">
                                  <div className={cn(
                                    "absolute left-2 w-5 h-5 rounded-full border-2 bg-card flex items-center justify-center",
                                    event.type === "converted" || event.type === "profile_converted"
                                      ? "border-green-500 text-green-500"
                                      : event.type === "note" || event.type === "lead_note" || event.type === "profile_note"
                                        ? "border-blue-500 text-blue-500"
                                        : event.type === "payment"
                                          ? "border-violet-500 text-violet-500"
                                          : "border-muted-foreground text-muted-foreground"
                                  )}>
                                    {event.type === "converted" || event.type === "lead_converted" || event.type === "profile_converted" ? (
                                      <LinkIcon className="h-2.5 w-2.5" />
                                    ) : event.type === "note" || event.type === "lead_note" || event.type === "profile_note" ? (
                                      <BookOpen className="h-2.5 w-2.5" />
                                    ) : event.type === "payment" ? (
                                      <Calendar className="h-2.5 w-2.5" />
                                    ) : (
                                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                    )}
                                  </div>
                                  <div className="bg-card/50 rounded-lg p-4 border border-border/50">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="font-medium text-sm">{event.description}</p>
                                        {event.metadata?.note && (
                                          <p className="text-sm text-muted-foreground mt-1">
                                            &ldquo;{event.metadata.note}&rdquo;
                                          </p>
                                        )}
                                        {event.metadata?.creator && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            por {event.metadata.creator}
                                          </p>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground shrink-0">
                                        {format(new Date(event.date), "dd/MM HH:mm", { locale: ptBR })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    {/* Notes Tab */}
                    <TabsContent value="notes" className="h-full m-0 data-[state=active]:flex flex-col">
                      <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Add note form */}
                        {isColdLead && (
                          <div className="p-4 border-b border-border/50">
                            <div className="flex gap-2">
                              <Textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Adicionar nova nota..."
                                className="min-h-[80px] bg-muted/30 border-border/50 resize-none"
                              />
                            </div>
                            <div className="flex justify-end mt-2">
                              <Button
                                onClick={handleAddNote}
                                disabled={!newNote.trim() || isAddingNote}
                                size="sm"
                                className="gap-2"
                              >
                                {isAddingNote ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                                Adicionar
                              </Button>
                            </div>
                          </div>
                        )}

                        <ScrollArea className="flex-1">
                          <div className="p-4 space-y-3">
                            {notes.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <BookOpen className="h-8 w-8 mb-2 opacity-40" />
                                <p className="text-sm">Nenhuma nota registrada</p>
                              </div>
                            ) : (
                              notes.map((note: any) => (
                                <div
                                  key={note.id}
                                  className="bg-card/50 rounded-lg p-4 border border-border/50 group"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm flex-1">{note.note}</p>
                                    {isColdLead && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-400"
                                        onClick={() => handleDeleteNote(note.id)}
                                        disabled={isDeletingNote === note.id}
                                      >
                                        {isDeletingNote === note.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-3 w-3" />
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                    <span>{note.creator?.name || note.creator?.email || "Admin"}</span>
                                    <span>-</span>
                                    <span>{formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: ptBR })}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
