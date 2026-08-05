"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Edit,
  Filter,
  Loader2,
  MoreVertical,
  Search,
  ShieldCheck,
  Trash2,
  User,
  Users,
  XCircle,
} from "lucide-react"

import {
  deleteUser,
  bulkDeleteUsers,
  updateUserPlan,
  updateUserRole,
  updateUserTrial,
} from "@/app/actions/users"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DEFAULT_TRIAL_DAYS,
  TRIAL_OPTIONS,
  getRemainingTrialDays,
  getTrialDurationFromDates,
  normalizeTrialDays,
} from "@/lib/trial"
import { UserEditDialog } from "./user-edit-dialog"
import { CreateVendedorDialog } from "./create-vendedor-dialog"

export type UserRow = {
  id: string
  email: string
  name: string | null
  telefone?: string | null
  cro: string | null
  especialidade: string | null
  role: string | null
  trial_started_at: string | null
  trial_ends_at: string | null
  trial_used: boolean | null
  plan_type: string | null
  subscription_status: string | null
  expires_at: string | null
  created_at: string
  updated_at: string | null
}

interface UsersManagerProps {
  users: UserRow[]
  adminName: string
}

export function UsersManager({ users, adminName }: UsersManagerProps) {
  const router = useRouter()
  const [isActionPending, startActionTransition] = useTransition()
  const [isBulkPending, startBulkTransition] = useTransition()
  void adminName

  // Estado da UI
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>("all")
  const [trialFilter, setTrialFilter] = useState<string>("all")

  // Estado de ações e diálogos
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [dialogMessage, setDialogMessage] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [trialDialogOpen, setTrialDialogOpen] = useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [createVendedorDialogOpen, setCreateVendedorDialogOpen] = useState(false)
  const [newRole, setNewRole] = useState<"cliente" | "admin" | "vendedor">("cliente")
  const [planForm, setPlanForm] = useState({
    plan_type: "free" as "free" | "monthly" | "annual",
    subscription_status: "free" as "free" | "active" | "canceled" | "past_due" | "refunded",
  })
  const [trialAction, setTrialAction] = useState<"start" | "clear" | "mark_used">("start")
  const [trialDays, setTrialDays] = useState<number>(DEFAULT_TRIAL_DAYS)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState<{
    current: number
    total: number
    status: "idle" | "processing" | "completed" | "error"
  }>({ current: 0, total: 0, status: "idle" })
  const [bulkDialogMessage, setBulkDialogMessage] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [bulkRoleEnabled, setBulkRoleEnabled] = useState(false)
  const [bulkRole, setBulkRole] = useState<"cliente" | "admin" | "vendedor">("cliente")
  const [bulkPlanEnabled, setBulkPlanEnabled] = useState(false)
  const [bulkPlanForm, setBulkPlanForm] = useState({
    plan_type: "free" as "free" | "monthly" | "annual",
    subscription_status: "free" as "free" | "active" | "canceled" | "past_due" | "refunded",
  })
  const [bulkTrialEnabled, setBulkTrialEnabled] = useState(false)
  const [bulkTrialAction, setBulkTrialAction] = useState<"start" | "clear" | "mark_used">("start")
  const [bulkTrialDays, setBulkTrialDays] = useState<number>(DEFAULT_TRIAL_DAYS)

  // Filtrar usuários
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Filtro de busca
      const matchesSearch = searchQuery
        ? (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()))
        : true

      // Filtro de role
      const matchesRole =
        roleFilter === "all" ? true : user.role === roleFilter

      // Filtro de assinatura
      const matchesSubscription =
        subscriptionFilter === "all"
          ? true
          : subscriptionFilter === "active"
            ? user.subscription_status === "active" || user.plan_type !== "free"
            : subscriptionFilter === "free"
              ? user.plan_type === "free" || !user.plan_type
              : user.subscription_status === subscriptionFilter

      // Filtro de trial
      const matchesTrial =
        trialFilter === "all"
          ? true
          : trialFilter === "used"
            ? user.trial_used === true
            : trialFilter === "not_used"
              ? user.trial_used === false || user.trial_used === null
              : trialFilter === "active"
                ? user.trial_ends_at &&
                new Date(user.trial_ends_at) > new Date() &&
                user.trial_used === false
                : true

      return matchesSearch && matchesRole && matchesSubscription && matchesTrial
    })
  }, [users, searchQuery, roleFilter, subscriptionFilter, trialFilter])

  // Remove seleções que não estão mais filtradas (ajuste de estado durante o render)
  const [prevFilteredUsers, setPrevFilteredUsers] = useState(filteredUsers)
  if (prevFilteredUsers !== filteredUsers) {
    setPrevFilteredUsers(filteredUsers)
    const filteredIds = new Set(filteredUsers.map((user) => user.id))
    setSelectedUsers((prev) => {
      const next = prev.filter((id) => filteredIds.has(id))
      if (next.length === prev.length && next.every((id, index) => id === prev[index])) {
        return prev
      }
      return next
    })
  }

  // Estatísticas
  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === "admin").length,
      clients: users.filter((u) => u.role === "cliente" || !u.role).length,
      vendedores: users.filter((u) => u.role === "vendedor").length,
      withSubscription: users.filter(
        (u) => u.plan_type && u.plan_type !== "free"
      ).length,
      trialUsed: users.filter((u) => u.trial_used === true).length,
    }
  }, [users])

  // Resetar filtros
  const handleResetFilters = () => {
    setSearchQuery("")
    setRoleFilter("all")
    setSubscriptionFilter("all")
    setTrialFilter("all")
  }

  const hasActiveFilters =
    searchQuery || roleFilter !== "all" || subscriptionFilter !== "all" || trialFilter !== "all"

  const allFilteredSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((user) => selectedUsers.includes(user.id))
  const hasBulkSelection = selectedUsers.length > 0

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map((user) => user.id))
    } else {
      setSelectedUsers([])
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }


  const getRoleBadge = (role: string | null) => {
    if (role === "admin") {
      return (
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
          Admin
        </Badge>
      )
    }
    if (role === "vendedor") {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          Vendedor
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="border-slate-600 text-slate-400 bg-slate-800/50"
      >
        Cliente
      </Badge>
    )
  }

  const getPlanBadge = (planType: string | null, status: string | null) => {
    if (planType === "free" || !planType) {
      return (
        <Badge
          variant="outline"
          className="border-slate-600 text-slate-400 bg-slate-800/50"
        >
          Gratuito
        </Badge>
      )
    }
    if (status === "active") {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          {planType}
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="border-amber-500/30 text-amber-400 bg-amber-500/10"
      >
        {planType}
      </Badge>
    )
  }

  const getTrialStatus = (user: UserRow) => {
    const pluralizeDays = (days: number) => `${days} dia${days !== 1 ? "s" : ""}`
    const durationDays = user.trial_started_at && user.trial_ends_at
      ? getTrialDurationFromDates(user.trial_started_at, user.trial_ends_at, DEFAULT_TRIAL_DAYS)
      : DEFAULT_TRIAL_DAYS
    const daysRemaining = getRemainingTrialDays(user.trial_ends_at)
    const isActive = user.trial_ends_at ? new Date(user.trial_ends_at) > new Date() : false
    const activeDaysToShow = isActive && daysRemaining === 0 ? 1 : daysRemaining

    if (user.trial_used === true) {
      return (
        <Badge
          variant="outline"
          className="border-slate-600 text-slate-500 bg-slate-800/50"
        >
          Usado ({pluralizeDays(durationDays)})
        </Badge>
      )
    }

    if (isActive && user.trial_used === false) {
      return (
        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
          {pluralizeDays(activeDaysToShow)} restante{activeDaysToShow !== 1 ? "s" : ""} de {durationDays}
        </Badge>
      )
    }

    if (user.trial_ends_at && user.trial_used === false) {
      return (
        <Badge
          variant="outline"
          className="border-slate-600 text-slate-500 bg-slate-800/50"
        >
          Expirado ({pluralizeDays(durationDays)})
        </Badge>
      )
    }

    return (
      <Badge
        variant="outline"
        className="border-cyan-500/30 text-cyan-300 bg-cyan-500/10"
      >
        Disponível ({pluralizeDays(durationDays)})
      </Badge>
    )
  }

  const getTrialSummary = (user: UserRow) => {
    if (user.trial_used) {
      return "Trial marcado como utilizado."
    }

    if (user.trial_ends_at) {
      const durationDays = getTrialDurationFromDates(
        user.trial_started_at,
        user.trial_ends_at,
        DEFAULT_TRIAL_DAYS
      )
      const trialDate = new Date(user.trial_ends_at)
      const formatted = trialDate.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })

      if (trialDate > new Date()) {
        return `Trial de ${durationDays} dia${durationDays !== 1 ? "s" : ""} ativo até ${formatted}.`
      }

      return `Trial de ${durationDays} dia${durationDays !== 1 ? "s" : ""} expirou em ${formatted}.`
    }

    return "Trial não iniciado."
  }

  const handleActionSuccess = (message: string) => {
    setStatusMessage({ type: "success", message })
    setDialogMessage(null)
    const currentMessage = message
    setTimeout(() => {
      setStatusMessage((prev) => (prev?.message === currentMessage ? null : prev))
    }, 3500)
    router.refresh()
  }

  const resetBulkDialogState = () => {
    setBulkDialogMessage(null)
    setBulkRoleEnabled(false)
    setBulkPlanEnabled(false)
    setBulkTrialEnabled(false)
    setBulkRole("cliente")
    setBulkPlanForm({
      plan_type: "free",
      subscription_status: "free",
    })
    setBulkTrialAction("start")
    setBulkTrialDays(DEFAULT_TRIAL_DAYS)
  }

  const handleOpenEdit = (user: UserRow) => {
    setSelectedUser(user)
    setDialogMessage(null)
    setEditDialogOpen(true)
  }

  const handleOpenPlan = (user: UserRow) => {
    setSelectedUser(user)
    setDialogMessage(null)
    setPlanForm({
      plan_type: (user.plan_type as "free" | "monthly" | "annual") || "free",
      subscription_status:
        (user.subscription_status as
          | "free"
          | "active"
          | "canceled"
          | "past_due"
          | "refunded") || (user.plan_type && user.plan_type !== "free" ? "active" : "free"),
    })
    setPlanDialogOpen(true)
  }

  const handleOpenTrial = (user: UserRow) => {
    setSelectedUser(user)
    setDialogMessage(null)
    const defaultAction: "start" | "clear" | "mark_used" =
      user.trial_used === true
        ? "mark_used"
        : user.trial_ends_at && new Date(user.trial_ends_at) > new Date()
          ? "clear"
          : "start"
    const currentDuration = user.trial_started_at && user.trial_ends_at
      ? getTrialDurationFromDates(user.trial_started_at, user.trial_ends_at, DEFAULT_TRIAL_DAYS)
      : DEFAULT_TRIAL_DAYS
    setTrialDays(currentDuration)
    setTrialAction(defaultAction)
    setTrialDialogOpen(true)
  }

  const handleOpenRole = (user: UserRow) => {
    setSelectedUser(user)
    setDialogMessage(null)
    // Alterna entre os roles disponíveis
    if (user.role === "admin") {
      setNewRole("cliente")
    } else if (user.role === "vendedor") {
      setNewRole("admin")
    } else {
      setNewRole("admin")
    }
    setRoleDialogOpen(true)
  }

  const handleOpenDelete = (user: UserRow) => {
    setSelectedUser(user)
    setDialogMessage(null)
    setDeleteDialogOpen(true)
  }

  const handlePlanUpdate = () => {
    if (!selectedUser) return
    startActionTransition(async () => {
      const result = await updateUserPlan(selectedUser.id, planForm)
      if (result.success) {
        setPlanDialogOpen(false)
        handleActionSuccess("Plano atualizado com sucesso.")
      } else {
        setDialogMessage({
          type: "error",
          message: result.error || "Erro ao atualizar plano",
        })
      }
    })
  }

  const handleRoleUpdate = () => {
    if (!selectedUser) return
    startActionTransition(async () => {
      const result = await updateUserRole(selectedUser.id, newRole)
      if (result.success) {
        setRoleDialogOpen(false)
        handleActionSuccess("Função atualizada com sucesso.")
      } else {
        setDialogMessage({
          type: "error",
          message: result.error || "Erro ao atualizar função",
        })
      }
    })
  }

  const handleTrialUpdate = () => {
    if (!selectedUser) return
    startActionTransition(async () => {
      const result = await updateUserTrial(selectedUser.id, {
        action: trialAction,
        days: normalizeTrialDays(trialDays, DEFAULT_TRIAL_DAYS),
      })
      if (result.success) {
        setTrialDialogOpen(false)
        handleActionSuccess("Trial atualizado com sucesso.")
      } else {
        setDialogMessage({
          type: "error",
          message: result.error || "Erro ao atualizar trial",
        })
      }
    })
  }

  const handleDeleteUser = () => {
    if (!selectedUser) return
    startActionTransition(async () => {
      const result = await deleteUser(selectedUser.id)
      if (result.success) {
        setDeleteDialogOpen(false)
        setSelectedUser(null)
        handleActionSuccess("Usuário excluído com sucesso.")
      } else {
        setDialogMessage({
          type: "error",
          message: result.error || "Erro ao excluir usuário",
        })
      }
    })
  }

  const handleBulkUpdate = () => {
    if (!hasBulkSelection) return
    if (!bulkRoleEnabled && !bulkPlanEnabled && !bulkTrialEnabled) {
      setBulkDialogMessage({
        type: "error",
        message: "Selecione ao menos um tipo de alteração para aplicar.",
      })
      return
    }

    startBulkTransition(async () => {
      setBulkDialogMessage(null)
      const normalizedTrialDays = normalizeTrialDays(bulkTrialDays, DEFAULT_TRIAL_DAYS)
      let successCount = 0
      const errors: string[] = []

      for (const userId of selectedUsers) {
        let userSucceeded = true

        if (bulkRoleEnabled) {
          const roleResult = await updateUserRole(userId, bulkRole)
          if (!roleResult.success) {
            userSucceeded = false
            errors.push(roleResult.error || `Erro ao atualizar role de ${userId}`)
          }
        }

        if (bulkPlanEnabled) {
          const planResult = await updateUserPlan(userId, {
            plan_type: bulkPlanForm.plan_type,
            subscription_status: bulkPlanForm.subscription_status,
          })
          if (!planResult.success) {
            userSucceeded = false
            errors.push(planResult.error || `Erro ao atualizar plano de ${userId}`)
          }
        }

        if (bulkTrialEnabled) {
          const trialResult = await updateUserTrial(userId, {
            action: bulkTrialAction,
            days: normalizedTrialDays,
          })
          if (!trialResult.success) {
            userSucceeded = false
            errors.push(trialResult.error || `Erro ao atualizar trial de ${userId}`)
          }
        }

        if (userSucceeded) {
          successCount += 1
        }
      }

      if (errors.length > 0) {
        router.refresh()
        setBulkDialogMessage({
          type: "error",
          message: `Algumas alterações falharam (${errors.length}). ${errors[0]}`,
        })
        return
      }

      setBulkDialogOpen(false)
      setSelectedUsers([])
      handleActionSuccess(
        successCount === 1
          ? "1 usuário atualizado com sucesso."
          : `${successCount} usuários atualizados com sucesso.`
      )
    })
  }

  const handleBulkDelete = () => {
    if (!hasBulkSelection) return

    const totalUsers = selectedUsers.length
    setBulkDeleteProgress({ current: 0, total: totalUsers, status: "processing" })
    setDialogMessage(null)

    let progressInterval: NodeJS.Timeout | null = null

    startBulkTransition(async () => {
      try {
        // Simular progresso visual durante a exclusão
        // Como a exclusão é feita em lote no servidor, simulamos o progresso para melhor UX
        let progressValue = 0
        progressInterval = setInterval(() => {
          progressValue += Math.max(1, Math.floor(totalUsers / 15))
          const cappedProgress = Math.min(progressValue, Math.floor(totalUsers * 0.85))

          setBulkDeleteProgress((prev) => {
            if (prev.status !== "processing") {
              if (progressInterval) clearInterval(progressInterval)
              return prev
            }
            return { ...prev, current: cappedProgress }
          })
        }, 150)

        const result = await bulkDeleteUsers({ userIds: selectedUsers })

        if (progressInterval) {
          clearInterval(progressInterval)
          progressInterval = null
        }

        if (result.success) {
          // Atualizar para 100% imediatamente
          setBulkDeleteProgress({ current: totalUsers, total: totalUsers, status: "completed" })

          const affected = result.data?.affected || selectedUsers.length
          const failed = result.data?.failed || 0

          // Delay para mostrar conclusão antes de fechar
          setTimeout(() => {
            setBulkDeleteDialogOpen(false)
            setSelectedUsers([])
            setBulkDeleteProgress({ current: 0, total: 0, status: "idle" })

            if (failed > 0 && result.error) {
              handleActionSuccess(result.error)
            } else {
              handleActionSuccess(
                affected === 1
                  ? "1 usuário excluído com sucesso."
                  : `${affected} usuário${affected > 1 ? "s" : ""} excluído${affected > 1 ? "s" : ""} com sucesso.`
              )
            }
          }, 1000)
        } else {
          setBulkDeleteProgress({ current: 0, total: totalUsers, status: "error" })
          setDialogMessage({
            type: "error",
            message: result.error || "Erro ao excluir usuários",
          })
        }
      } catch (error) {
        if (progressInterval) {
          clearInterval(progressInterval)
        }
        setBulkDeleteProgress({ current: 0, total: totalUsers, status: "error" })
        setDialogMessage({
          type: "error",
          message: "Erro inesperado ao excluir usuários",
        })
      }
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {statusMessage && (
        <Alert
          className={
            statusMessage.type === "success"
              ? "bg-green-500/10 border-green-500/30"
              : "bg-red-500/10 border-red-500/30"
          }
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          ) : (
            <XCircle className="h-4 w-4 text-red-400" />
          )}
          <AlertDescription
            className={statusMessage.type === "success" ? "text-green-300" : "text-red-300"}
          >
            {statusMessage.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-[#131D37] border border-[#24324F] rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-slate-400 truncate">Total de Usuários</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 ml-2">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-[#131D37] border border-[#24324F] rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-slate-400 truncate">Administradores</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-400 mt-1">
                {stats.admins}
              </p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 ml-2">
              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-[#131D37] border border-[#24324F] rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-slate-400 truncate">Clientes</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-300 mt-1">
                {stats.clients}
              </p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-slate-500/10 flex items-center justify-center flex-shrink-0 ml-2">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="bg-[#131D37] border border-[#24324F] rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-slate-400 truncate">Vendedores</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-400 mt-1">
                {stats.vendedores}
              </p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 ml-2">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-[#131D37] border border-[#24324F] rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-slate-400 truncate">Com Assinatura</p>
              <p className="text-xl sm:text-2xl font-bold text-green-400 mt-1">
                {stats.withSubscription}
              </p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 ml-2">
              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-[#131D37] border border-[#24324F] rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-slate-400 truncate">Trial Usado</p>
              <p className="text-xl sm:text-2xl font-bold text-cyan-400 mt-1">
                {stats.trialUsed}
              </p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0 ml-2">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de ações */}
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Botões de ação */}
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              window.location.href = '/api/admin/users/export'
            }}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Planilha
          </Button>
          <Button
            onClick={() => setCreateVendedorDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Users className="mr-2 h-4 w-4" />
            Criar Vendedor
          </Button>
        </div>

        {/* Busca */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#131D37] border-slate-600 text-white placeholder:text-slate-500 w-full"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* Filtro por role */}
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[140px] bg-[#131D37] border-slate-600 text-white">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent className="bg-[#131D37] border-slate-600">
              <SelectItem value="all" className="text-white">
                Todos os roles
              </SelectItem>
              <SelectItem value="admin" className="text-white">
                Administradores
              </SelectItem>
              <SelectItem value="cliente" className="text-white">
                Clientes
              </SelectItem>
              <SelectItem value="vendedor" className="text-white">
                Vendedores
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por assinatura */}
          <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[140px] bg-[#131D37] border-slate-600 text-white">
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent className="bg-[#131D37] border-slate-600">
              <SelectItem value="all" className="text-white">
                Todos os planos
              </SelectItem>
              <SelectItem value="active" className="text-white">
                Com Assinatura
              </SelectItem>
              <SelectItem value="free" className="text-white">
                Gratuito
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por trial */}
          <Select value={trialFilter} onValueChange={setTrialFilter}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[140px] bg-[#131D37] border-slate-600 text-white">
              <SelectValue placeholder="Trial" />
            </SelectTrigger>
            <SelectContent className="bg-[#131D37] border-slate-600">
              <SelectItem value="all" className="text-white">
                Todos
              </SelectItem>
              <SelectItem value="active" className="text-white">
                Trial Ativo
              </SelectItem>
              <SelectItem value="used" className="text-white">
                Trial Usado
              </SelectItem>
              <SelectItem value="not_used" className="text-white">
                Trial Não Usado
              </SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={handleResetFilters}
              className="text-slate-400 hover:text-white w-full sm:w-auto"
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Seleção em massa */}
      {hasBulkSelection && (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 rounded-lg border border-slate-700 bg-[#0F192F] p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="select-all-users"
              checked={allFilteredSelected}
              onCheckedChange={(value) => handleSelectAll(value === true)}
              className="data-[state=checked]:bg-cyan-600 data-[state=indeterminate]:bg-cyan-600 border-slate-600"
              aria-label="Selecionar todos os usuários filtrados"
            />
            <div className="space-y-0.5">
              <Label htmlFor="select-all-users" className="text-sm font-semibold text-white">
                Selecionar todos os {filteredUsers.length} exibidos
              </Label>
              <p className="text-xs text-slate-400">
                {selectedUsers.length} selecionado{selectedUsers.length === 1 ? "" : "s"} · segue os filtros ativos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setSelectedUsers([])}
              className="text-slate-300 hover:text-white px-3"
            >
              Limpar
            </Button>
            {selectedUsers.length === 1 ? (
              <>
                {/* Botões para 1 usuário selecionado */}
                <Button
                  onClick={() => {
                    const selectedUser = users.find((u) => u.id === selectedUsers[0])
                    if (selectedUser) {
                      handleOpenEdit(selectedUser)
                    }
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-3"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  onClick={() => {
                    const selectedUser = users.find((u) => u.id === selectedUsers[0])
                    if (selectedUser) {
                      handleOpenDelete(selectedUser)
                    }
                  }}
                  disabled={isActionPending}
                  className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </>
            ) : (
              <>
                {/* Botões para múltiplos usuários selecionados */}
                <Button
                  onClick={() => {
                    setBulkDialogOpen(true)
                    setBulkDialogMessage(null)
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-3"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar em massa
                </Button>
                <Button
                  onClick={() => {
                    setBulkDeleteDialogOpen(true)
                    setBulkDeleteProgress({ current: 0, total: selectedUsers.length, status: "idle" })
                    setDialogMessage(null)
                  }}
                  disabled={isBulkPending || bulkDeleteProgress.status === "processing"}
                  className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkDeleteProgress.status === "processing" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir em massa
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tabela Desktop / Cards Mobile */}
      {/* Desktop: Tabela */}
      <div className="hidden md:block rounded-lg border border-slate-700 bg-[#0F192F] overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-[#131D37]">
                <TableHead className="w-12">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={(value) => handleSelectAll(value === true)}
                    aria-label="Selecionar todos os usuários filtrados"
                    className="data-[state=checked]:bg-cyan-600 data-[state=indeterminate]:bg-cyan-600 border-slate-600"
                  />
                </TableHead>
                <TableHead className="text-white">Nome</TableHead>
                <TableHead className="text-white">Email</TableHead>
                <TableHead className="text-white">Role</TableHead>
                <TableHead className="text-white">Plano</TableHead>
                <TableHead className="text-white">Trial</TableHead>
                <TableHead className="text-white">Cadastro</TableHead>
                <TableHead className="text-white text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-40 text-center text-slate-400"
                  >
                    {users.length === 0
                      ? "Nenhum usuário encontrado"
                      : "Nenhum usuário encontrado com os filtros aplicados"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="border-slate-700 hover:bg-[#131D37]"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                        aria-label={`Selecionar ${user.email}`}
                        className="data-[state=checked]:bg-cyan-600 border-slate-600"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Link
                          href={`/admin/usuarios/${user.id}`}
                          className="font-medium text-white hover:text-cyan-400 transition-colors cursor-pointer"
                        >
                          {user.name || "Sem nome"}
                        </Link>
                        {user.telefone && (
                          <p className="text-sm text-slate-400">{user.telefone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-slate-300 truncate max-w-xs">{user.email}</p>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {getPlanBadge(user.plan_type, user.subscription_status)}
                    </TableCell>
                    <TableCell>{getTrialStatus(user)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-400">
                        {formatDistanceToNow(new Date(user.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-[#16243F]"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Abrir menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#131D37] border-slate-700 text-white"
                        >
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/admin/usuarios/${user.id}`}
                              className="hover:bg-[#16243F] cursor-pointer flex items-center"
                            >
                              <User className="mr-2 h-4 w-4" />
                              Ver Perfil Completo
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleOpenEdit(user)}
                            className="hover:bg-[#16243F] cursor-pointer flex items-center"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar dados
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleOpenPlan(user)}
                            className="hover:bg-[#16243F] cursor-pointer flex items-center"
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Alterar plano
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleOpenRole(user)}
                            className="hover:bg-[#16243F] cursor-pointer flex items-center"
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Alterar role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleOpenTrial(user)}
                            className="hover:bg-[#16243F] cursor-pointer flex items-center"
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Gerenciar trial
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-700" />
                          <DropdownMenuItem
                            onSelect={() => handleOpenDelete(user)}
                            className="hover:bg-red-500/10 text-red-300 focus:text-red-200 cursor-pointer flex items-center"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir usuário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="bg-[#131D37] border border-slate-700 rounded-lg p-8 text-center">
            <p className="text-slate-400">
              {users.length === 0
                ? "Nenhum usuário encontrado"
                : "Nenhum usuário encontrado com os filtros aplicados"}
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-[#131D37] border border-slate-700 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => toggleUserSelection(user.id)}
                    aria-label={`Selecionar ${user.email}`}
                    className="mt-1 data-[state=checked]:bg-cyan-600 border-slate-600"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/usuarios/${user.id}`}
                      className="font-semibold text-white text-base truncate hover:text-cyan-400 transition-colors block"
                    >
                      {user.name || "Sem nome"}
                    </Link>
                    <p className="text-sm text-slate-400 truncate mt-1">{user.email}</p>
                    {user.telefone && (
                      <p className="text-xs text-slate-500 mt-1">{user.telefone}</p>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-[#16243F] flex-shrink-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Abrir menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-[#131D37] border-slate-700 text-white"
                  >
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/admin/usuarios/${user.id}`}
                        className="hover:bg-[#16243F] cursor-pointer flex items-center"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Ver Perfil Completo
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleOpenEdit(user)}
                      className="hover:bg-[#16243F] cursor-pointer flex items-center"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar dados
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleOpenPlan(user)}
                      className="hover:bg-[#16243F] cursor-pointer flex items-center"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Alterar plano
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleOpenRole(user)}
                      className="hover:bg-[#16243F] cursor-pointer flex items-center"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Alterar role
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleOpenTrial(user)}
                      className="hover:bg-[#16243F] cursor-pointer flex items-center"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Gerenciar trial
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem
                      onSelect={() => handleOpenDelete(user)}
                      className="hover:bg-red-500/10 text-red-300 focus:text-red-200 cursor-pointer flex items-center"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir usuário
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap gap-2">
                {getRoleBadge(user.role)}
                {getPlanBadge(user.plan_type, user.subscription_status)}
                {getTrialStatus(user)}
              </div>

              <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
                Cadastrado {formatDistanceToNow(new Date(user.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resultados da busca */}
      {filteredUsers.length === 0 && users.length > 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400">
            Nenhum usuário encontrado com os filtros aplicados
          </p>
          <Button
            variant="ghost"
            onClick={handleResetFilters}
            className="mt-4 text-cyan-500 hover:text-cyan-400"
          >
            Limpar filtros
          </Button>
        </div>
      )}

      <Dialog
        open={bulkDialogOpen}
        onOpenChange={(open) => {
          setBulkDialogOpen(open)
          if (!open) {
            resetBulkDialogState()
          }
        }}
      >
        <DialogContent className="bg-[#0F192F] border-slate-700 text-white max-w-3xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Edição em massa</DialogTitle>
            <DialogDescription className="text-slate-400">
              Aplique mudanças nos {selectedUsers.length} usuários selecionados sem sair da listagem.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-700 bg-[#0F192F] p-3 sm:p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">Role</p>
                  <p className="text-xs text-slate-400">
                    Conceda ou remova acesso de administrador para todos os selecionados.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={bulkRoleEnabled}
                    onCheckedChange={(value) => setBulkRoleEnabled(value === true)}
                    className="data-[state=checked]:bg-cyan-600 border-slate-600"
                    aria-label="Habilitar edição de role em massa"
                  />
                  <span className="text-xs text-slate-400">Ativar</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  value={bulkRole}
                  onValueChange={(value) => setBulkRole(value as "cliente" | "admin" | "vendedor")}
                  disabled={!bulkRoleEnabled}
                >
                  <SelectTrigger className="bg-[#131D37] border-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                    <SelectValue placeholder="Selecione a role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131D37] border-slate-600">
                    <SelectItem value="cliente" className="text-white">
                      Cliente
                    </SelectItem>
                    <SelectItem value="admin" className="text-white">
                      Administrador
                    </SelectItem>
                    <SelectItem value="vendedor" className="text-white">
                      Vendedor
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-slate-700 bg-[#0F192F] p-3 sm:p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">Plano e assinatura</p>
                  <p className="text-xs text-slate-400">
                    Defina o plano padrão e o status de assinatura para todos os selecionados.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={bulkPlanEnabled}
                    onCheckedChange={(value) => setBulkPlanEnabled(value === true)}
                    className="data-[state=checked]:bg-cyan-600 border-slate-600"
                    aria-label="Habilitar edição de plano em massa"
                  />
                  <span className="text-xs text-slate-400">Ativar</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  value={bulkPlanForm.plan_type}
                  onValueChange={(value) => {
                    const planValue = value as "free" | "monthly" | "annual"
                    setBulkPlanForm((prev) => ({
                      ...prev,
                      plan_type: planValue,
                      subscription_status:
                        planValue === "free"
                          ? "free"
                          : prev.subscription_status === "free"
                            ? "active"
                            : prev.subscription_status,
                    }))
                  }}
                  disabled={!bulkPlanEnabled}
                >
                  <SelectTrigger className="bg-[#131D37] border-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131D37] border-slate-600">
                    <SelectItem value="free" className="text-white">
                      Gratuito
                    </SelectItem>
                    <SelectItem value="monthly" className="text-white">
                      Mensal
                    </SelectItem>
                    <SelectItem value="annual" className="text-white">
                      Anual
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={bulkPlanForm.subscription_status}
                  onValueChange={(value) =>
                    setBulkPlanForm((prev) => ({
                      ...prev,
                      subscription_status: value as
                        | "free"
                        | "active"
                        | "canceled"
                        | "past_due"
                        | "refunded",
                    }))
                  }
                  disabled={!bulkPlanEnabled}
                >
                  <SelectTrigger className="bg-[#131D37] border-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131D37] border-slate-600">
                    <SelectItem value="free" className="text-white">
                      Gratuito
                    </SelectItem>
                    <SelectItem value="active" className="text-white">
                      Ativo
                    </SelectItem>
                    <SelectItem value="canceled" className="text-white">
                      Cancelado
                    </SelectItem>
                    <SelectItem value="past_due" className="text-white">
                      Atrasado
                    </SelectItem>
                    <SelectItem value="refunded" className="text-white">
                      Reembolsado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-slate-700 bg-[#0F192F] p-3 sm:p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">Trial</p>
                  <p className="text-xs text-slate-400">
                    Libere, limpe ou marque o trial para todos os usuários selecionados.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={bulkTrialEnabled}
                    onCheckedChange={(value) => setBulkTrialEnabled(value === true)}
                    className="data-[state=checked]:bg-cyan-600 border-slate-600"
                    aria-label="Habilitar edição de trial em massa"
                  />
                  <span className="text-xs text-slate-400">Ativar</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  value={bulkTrialAction}
                  onValueChange={(value) =>
                    setBulkTrialAction(value as "start" | "clear" | "mark_used")
                  }
                  disabled={!bulkTrialEnabled}
                >
                  <SelectTrigger className="bg-[#131D37] border-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                    <SelectValue placeholder="Selecione a ação de trial" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131D37] border-slate-600">
                    <SelectItem value="start" className="text-white">
                      Liberar novo trial
                    </SelectItem>
                    <SelectItem value="clear" className="text-white">
                      Limpar informações de trial
                    </SelectItem>
                    <SelectItem value="mark_used" className="text-white">
                      Marcar como trial utilizado
                    </SelectItem>
                  </SelectContent>
                </Select>

                {bulkTrialAction === "start" && (
                  <Select
                    value={String(bulkTrialDays)}
                    onValueChange={(value) =>
                      setBulkTrialDays(normalizeTrialDays(Number(value), DEFAULT_TRIAL_DAYS))
                    }
                    disabled={!bulkTrialEnabled}
                  >
                    <SelectTrigger className="bg-[#131D37] border-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                      <SelectValue placeholder="Duração do trial" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#131D37] border-slate-600">
                      {TRIAL_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)} className="text-white">
                          {option} dia{option !== 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Ação de trial não é aplicada em usuários com plano premium ativo.
              </p>
            </div>

            {bulkDialogMessage && (
              <Alert
                className={
                  bulkDialogMessage.type === "success"
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-red-500/10 border-red-500/30"
                }
              >
                <AlertDescription
                  className={
                    bulkDialogMessage.type === "success" ? "text-green-300" : "text-red-300"
                  }
                >
                  {bulkDialogMessage.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setBulkDialogOpen(false)
                resetBulkDialogState()
              }}
              className="border-slate-600 text-white hover:bg-slate-700"
              disabled={isBulkPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBulkUpdate}
              disabled={!hasBulkSelection || isBulkPending || (!bulkRoleEnabled && !bulkPlanEnabled && !bulkTrialEnabled)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {isBulkPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aplicando...
                </>
              ) : (
                `Aplicar em ${selectedUsers.length} usuário${selectedUsers.length === 1 ? "" : "s"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedUser && (
        <UserEditDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open)
            if (!open) setDialogMessage(null)
          }}
          user={selectedUser}
          onSuccess={() => {
            setEditDialogOpen(false)
            handleActionSuccess("Usuário atualizado com sucesso.")
          }}
        />
      )}

      {selectedUser && (
        <Dialog
          open={planDialogOpen}
          onOpenChange={(open) => {
            setPlanDialogOpen(open)
            if (!open) setDialogMessage(null)
          }}
        >
          <DialogContent className="bg-[#0F192F] border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Alterar plano</DialogTitle>
              <DialogDescription className="text-slate-400">
                Ajuste o plano e o status da assinatura de {selectedUser.email}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo de plano</Label>
                <Select
                  value={planForm.plan_type}
                  onValueChange={(value) => {
                    const planValue = value as "free" | "monthly" | "annual"
                    setPlanForm((prev) => ({
                      ...prev,
                      plan_type: planValue,
                      subscription_status:
                        planValue === "free"
                          ? "free"
                          : prev.subscription_status === "free"
                            ? "active"
                            : prev.subscription_status,
                    }))
                  }}
                >
                  <SelectTrigger className="bg-[#131D37] border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131D37] border-slate-600">
                    <SelectItem value="free" className="text-white">
                      Gratuito
                    </SelectItem>
                    <SelectItem value="monthly" className="text-white">
                      Mensal
                    </SelectItem>
                    <SelectItem value="annual" className="text-white">
                      Anual
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Status da assinatura</Label>
                <Select
                  value={planForm.subscription_status}
                  onValueChange={(value) =>
                    setPlanForm((prev) => ({
                      ...prev,
                      subscription_status: value as
                        | "free"
                        | "active"
                        | "canceled"
                        | "past_due"
                        | "refunded",
                    }))
                  }
                >
                  <SelectTrigger className="bg-[#131D37] border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131D37] border-slate-600">
                    <SelectItem value="free" className="text-white">
                      Gratuito
                    </SelectItem>
                    <SelectItem value="active" className="text-white">
                      Ativo
                    </SelectItem>
                    <SelectItem value="canceled" className="text-white">
                      Cancelado
                    </SelectItem>
                    <SelectItem value="past_due" className="text-white">
                      Atrasado
                    </SelectItem>
                    <SelectItem value="refunded" className="text-white">
                      Reembolsado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dialogMessage && planDialogOpen && (
                <Alert className="bg-red-500/10 border-red-500/30">
                  <AlertDescription className="text-red-300">
                    {dialogMessage.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setPlanDialogOpen(false)}
                className="border-slate-600 text-white hover:bg-slate-700"
                disabled={isActionPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePlanUpdate}
                disabled={isActionPending}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {isActionPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar alterações"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedUser && (
        <Dialog
          open={roleDialogOpen}
          onOpenChange={(open) => {
            setRoleDialogOpen(open)
            if (!open) setDialogMessage(null)
          }}
        >
          <DialogContent className="bg-[#0F192F] border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Alterar role</DialogTitle>
              <DialogDescription className="text-slate-400">
                Defina o nível de acesso de {selectedUser.email}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-slate-300">Função</Label>
                <Select value={newRole} onValueChange={(value) => setNewRole(value as "cliente" | "admin" | "vendedor")}>
                  <SelectTrigger className="bg-[#131D37] border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131D37] border-slate-600">
                    <SelectItem value="cliente" className="text-white">
                      Cliente
                    </SelectItem>
                    <SelectItem value="admin" className="text-white">
                      Administrador
                    </SelectItem>
                    <SelectItem value="vendedor" className="text-white">
                      Vendedor
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  A alteração impacta imediatamente as permissões do usuário.
                </p>
              </div>

              {dialogMessage && roleDialogOpen && (
                <Alert className="bg-red-500/10 border-red-500/30">
                  <AlertDescription className="text-red-300">
                    {dialogMessage.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setRoleDialogOpen(false)}
                className="border-slate-600 text-white hover:bg-slate-700"
                disabled={isActionPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRoleUpdate}
                disabled={isActionPending}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {isActionPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  "Salvar role"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedUser && (
        <Dialog
          open={trialDialogOpen}
          onOpenChange={(open) => {
            setTrialDialogOpen(open)
            if (!open) setDialogMessage(null)
          }}
        >
          <DialogContent className="bg-[#0F192F] border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Gerenciar trial</DialogTitle>
              <DialogDescription className="text-slate-400">
                Ajuste o status do período de trial de {selectedUser.email}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-[#131D37] border border-slate-700 rounded-md p-3">
                <p className="text-sm text-slate-300">Estado atual</p>
                <p className="text-xs text-slate-400 mt-1">{getTrialSummary(selectedUser)}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Ação</Label>
                <Select
                  value={trialAction}
                  onValueChange={(value) => setTrialAction(value as "start" | "clear" | "mark_used")}
                >
                  <SelectTrigger className="bg-[#131D37] border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131D37] border-slate-600">
                    <SelectItem value="start" className="text-white">
                      Liberar novo trial
                    </SelectItem>
                    <SelectItem value="clear" className="text-white">
                      Limpar informações de trial
                    </SelectItem>
                    <SelectItem value="mark_used" className="text-white">
                      Marcar como trial já utilizado
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Iniciar trial cria um novo período e marca como ativo. Limpar zera datas e permite reiniciar. Marcar como utilizado bloqueia novos trials.
                </p>
              </div>

              {trialAction === "start" && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Duração do trial</Label>
                  <Select
                    value={String(trialDays)}
                    onValueChange={(value) =>
                      setTrialDays(normalizeTrialDays(Number(value), DEFAULT_TRIAL_DAYS))
                    }
                  >
                    <SelectTrigger className="bg-[#131D37] border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#131D37] border-slate-600">
                      {TRIAL_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)} className="text-white">
                          {option} dia{option !== 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Padrão da landing: 7 dias. Links dedicados: 1, 3, 7 ou 30 dias.
                  </p>
                </div>
              )}

              {dialogMessage && trialDialogOpen && (
                <Alert className="bg-red-500/10 border-red-500/30">
                  <AlertDescription className="text-red-300">
                    {dialogMessage.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setTrialDialogOpen(false)}
                className="border-slate-600 text-white hover:bg-slate-700"
                disabled={isActionPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleTrialUpdate}
                disabled={isActionPending}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {isActionPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  "Salvar configuração"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedUser && (
        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open)
            if (!open) setDialogMessage(null)
          }}
        >
          <AlertDialogContent className="bg-[#0F192F] border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Excluir usuário</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Essa ação remove permanentemente {selectedUser.email}. Os dados não poderão ser recuperados.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {dialogMessage && deleteDialogOpen && (
              <Alert className="bg-red-500/10 border-red-500/30">
                <AlertDescription className="text-red-300">
                  {dialogMessage.message}
                </AlertDescription>
              </Alert>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel
                className="border-slate-600 text-white hover:bg-slate-700"
                disabled={isActionPending}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={isActionPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isActionPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Excluir usuário"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Dialog de confirmação de exclusão em massa */}
      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && bulkDeleteProgress.status !== "processing") {
            setBulkDeleteDialogOpen(false)
            setDialogMessage(null)
            setBulkDeleteProgress({ current: 0, total: 0, status: "idle" })
          }
        }}
      >
        <AlertDialogContent className="bg-[#0F192F] border-slate-700 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              {bulkDeleteProgress.status === "processing" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-red-400" />
                  Excluindo usuários...
                </>
              ) : bulkDeleteProgress.status === "completed" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  Exclusão concluída
                </>
              ) : (
                <>
                  <Trash2 className="h-5 w-5 text-red-400" />
                  Excluir usuários em massa
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {bulkDeleteProgress.status === "processing" ? (
                <span>
                  Processando exclusão de {selectedUsers.length} usuário{selectedUsers.length === 1 ? "" : "s"}...
                  <br />
                  <span className="text-xs text-slate-500 mt-1 block">
                    Isso pode levar alguns segundos. Por favor, aguarde.
                  </span>
                </span>
              ) : bulkDeleteProgress.status === "completed" ? (
                <span className="text-green-300">
                  Todos os usuários foram excluídos com sucesso.
                </span>
              ) : (
                <span>
                  Essa ação remove permanentemente <strong className="text-white">{selectedUsers.length}</strong> usuário{selectedUsers.length === 1 ? "" : "s"} selecionado{selectedUsers.length === 1 ? "" : "s"}. Os dados não poderão ser recuperados.
                  <br />
                  <span className="text-xs text-red-400/80 mt-2 block font-medium">
                    ⚠️ Esta ação é irreversível
                  </span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Barra de progresso */}
          {bulkDeleteProgress.status === "processing" && bulkDeleteProgress.total > 0 && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 font-medium">
                  Progresso
                </span>
                <span className="text-slate-400 font-semibold">
                  {bulkDeleteProgress.current} de {bulkDeleteProgress.total}
                </span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-300 ease-out shadow-lg shadow-red-500/50"
                  style={{
                    width: `${(bulkDeleteProgress.current / bulkDeleteProgress.total) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-400 text-center">
                {Math.round((bulkDeleteProgress.current / bulkDeleteProgress.total) * 100)}% concluído
              </p>
            </div>
          )}

          {bulkDeleteProgress.status === "completed" && (
            <div className="space-y-3 py-2">
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="absolute top-0 left-0 h-full w-full rounded-full bg-gradient-to-r from-green-500 to-green-600 shadow-lg shadow-green-500/50" />
              </div>
              <p className="text-xs text-green-400 text-center font-medium flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Exclusão finalizada com sucesso
              </p>
            </div>
          )}

          {dialogMessage && bulkDeleteDialogOpen && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertDescription className="text-red-300">
                {dialogMessage.message}
              </AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter>
            {bulkDeleteProgress.status === "processing" ? (
              <AlertDialogCancel
                className="border-slate-600 text-white hover:bg-slate-700"
                disabled={true}
              >
                Processando...
              </AlertDialogCancel>
            ) : bulkDeleteProgress.status === "completed" ? (
              <AlertDialogAction
                onClick={() => {
                  setBulkDeleteDialogOpen(false)
                  setBulkDeleteProgress({ current: 0, total: 0, status: "idle" })
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Fechar
              </AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel
                  className="border-slate-600 text-white hover:bg-slate-700"
                  disabled={isBulkPending}
                >
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  disabled={isBulkPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isBulkPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir {selectedUsers.length} usuário{selectedUsers.length === 1 ? "" : "s"}
                    </>
                  )}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de criação de vendedor */}
      <CreateVendedorDialog
        open={createVendedorDialogOpen}
        onOpenChange={setCreateVendedorDialogOpen}
      />
    </div>
  )
}
