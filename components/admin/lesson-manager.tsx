"use client"

import { useEffect, useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, ArrowUpRight, Edit, FileText, GripVertical, Loader2, Lock, Plus, Trash2, Video } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LessonFormDialog } from "@/components/admin/lesson-form-dialog"
import { ModuleFormDialog } from "@/components/admin/module-form-dialog"
import {
  deleteLessonAction,
  deleteModuleAction,
  reorderModulesAction,
  moveLessonBetweenModulesAction,
} from "@/app/actions/lesson-actions"
import type { LessonMaterialData } from "@/lib/validations/lesson"

export type LessonData = {
  id: string
  title: string
  description: string | null
  video_url: string | null
  duration_minutes: number | null
  module_title: string
  module_id: string | null
  order_index: number
  materials: LessonMaterialData[]
  available_at: string | null
}

export type ModuleWithLessons = {
  id: string | null
  title: string
  description: string | null
  order_index: number
  access_type?: "free" | "premium" | null
  lessons: LessonData[]
}

interface LessonManagerProps {
  courseId: string
  courseTitle: string
  modules: ModuleWithLessons[]
  modulesEnabled?: boolean
}

// Componente para aula arrastável
function SortableLesson({
  lesson,
  index,
  courseDashboardHref,
  onEdit,
  onDelete,
}: {
  lesson: LessonData
  index: number
  courseDashboardHref: string
  onEdit: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 rounded-lg bg-[#0F192F] border border-slate-700/50 hover:border-slate-600 transition-colors group"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-move text-slate-600 group-hover:text-slate-500 touch-none"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-400">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-white font-medium truncate">{lesson.title}</h4>
          {lesson.video_url && (
            <Video className="h-4 w-4 text-cyan-400 flex-shrink-0" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
          {lesson.duration_minutes && (
            <>
              <span>
                {Math.floor(lesson.duration_minutes / 60) > 0
                  ? `${Math.floor(lesson.duration_minutes / 60)}h${lesson.duration_minutes % 60 > 0
                    ? ` ${lesson.duration_minutes % 60}min`
                    : ""
                  }`
                  : `${lesson.duration_minutes}min`}
              </span>
              <span>•</span>
            </>
          )}
          {lesson.materials && lesson.materials.length > 0 && (
            <>
              <span>{lesson.materials.length} materiais</span>
              <span>•</span>
            </>
          )}
          <span>Ordem: {lesson.order_index}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          asChild
          className="border-cyan-500/40 text-cyan-100 hover:bg-cyan-500/10"
        >
          <Link href={`${courseDashboardHref}?lesson=${encodeURIComponent(lesson.id)}`}>
            <ArrowUpRight className="h-4 w-4 mr-1" />
            Ver no curso
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Componente para área de drop do módulo
function DroppableModule({
  moduleId,
  children,
  isEmpty,
}: {
  moduleId: string | null
  children: ReactNode
  isEmpty: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `module-${moduleId ?? "null"}`,
  })

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 min-h-[60px] p-2 rounded-lg border-2 border-dashed transition-colors ${isOver
        ? "border-cyan-500/50 bg-cyan-500/5"
        : isEmpty
          ? "border-slate-700/30 hover:border-slate-700/50"
          : "border-transparent hover:border-slate-700/30"
        }`}
    >
      {children}
    </div>
  )
}

export function LessonManager({ courseId, courseTitle, modules, modulesEnabled }: LessonManagerProps) {
  const isModulesEnabled = modulesEnabled ?? true
  const modulesDisabledTitle =
    "Ative a tabela lesson_modules (migration 013) no banco para criar e editar módulos."
  const courseDashboardHref = `/dashboard/cursos/${encodeURIComponent(courseId)}`

  const router = useRouter()
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<LessonData | null>(null)
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null)
  const [isDeletingLesson, setIsDeletingLesson] = useState(false)
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<ModuleWithLessons | null>(null)
  const [moduleDeleteTarget, setModuleDeleteTarget] = useState<ModuleWithLessons | null>(null)
  const [isDeletingModule, setIsDeletingModule] = useState(false)
  const [activeModuleId, setActiveModuleId] = useState<string | null>(
    modules[0]?.id ?? null
  )
  const [reorderingModuleId, setReorderingModuleId] = useState<string | null>(null)
  const [isReorderingModules, startReorderModules] = useTransition()

  // Estados para drag-and-drop
  const [localModules, setLocalModules] = useState<ModuleWithLessons[]>(modules)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [isMovingLesson, setIsMovingLesson] = useState(false)

  // Sensores para drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Atualizar módulos locais quando props mudarem
  useEffect(() => {
    setLocalModules(modules)
  }, [modules])

  useEffect(() => {
    setActiveModuleId(modules[0]?.id ?? null)
  }, [modules])

  const allLessons = modules.flatMap((module) => module.lessons)
  const reorderableModules = modules.filter(
    (module): module is ModuleWithLessons & { id: string } => module.id !== null
  )
  const moduleOrderMap = new Map(
    reorderableModules.map((module, index) => [module.id as string, index])
  )
  const now = new Date()
  const moduleCount = modules.filter((module) => module.id !== null).length
  const videoCount = allLessons.filter((lesson) => Boolean(lesson.video_url)).length
  const upcomingCount = allLessons.filter((lesson) => {
    if (!lesson.available_at) return false
    const when = new Date(lesson.available_at)
    return when > now
  }).length

  const moduleOptions = modules.map((module) => ({
    id: module.id,
    title: module.title,
  }))
  const moduleKey = moduleOptions.map((module) => module.id ?? "null").join(",")
  const lessonDialogKey = `${editingLesson?.id ?? "new"}-${activeModuleId ?? "null"}-${moduleKey}`

  const openLessonDialog = (moduleId: string | null | undefined) => {
    setActiveModuleId(moduleId ?? null)
    setEditingLesson(null)
    setIsLessonDialogOpen(true)
  }

  const handleDeleteLesson = async () => {
    if (!deletingLessonId) return
    setIsDeletingLesson(true)
    try {
      const result = await deleteLessonAction(deletingLessonId)
      if (result.success) {
        setDeletingLessonId(null)
        router.refresh()
      } else {
        alert(result.error || "Erro ao deletar aula")
      }
    } catch (error) {
      console.error(error)
      alert("Erro ao deletar aula")
    } finally {
      setIsDeletingLesson(false)
    }
  }

  const handleDeleteModule = async () => {
    if (!moduleDeleteTarget?.id) return
    setIsDeletingModule(true)
    try {
      const result = await deleteModuleAction(moduleDeleteTarget.id)
      if (result.success) {
        setModuleDeleteTarget(null)
        router.refresh()
      } else {
        alert(result.error || "Erro ao deletar módulo")
      }
    } catch (error) {
      console.error(error)
      alert("Erro ao deletar módulo")
    } finally {
      setIsDeletingModule(false)
    }
  }

  const handleReorderModule = (moduleId: string, direction: "up" | "down") => {
    if (!isModulesEnabled) return
    if (!moduleId) return

    const currentIndex = moduleOrderMap.get(moduleId)
    if (currentIndex === undefined) return

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= reorderableModules.length) return

    const updatedOrder = [...reorderableModules]
    const [movedModule] = updatedOrder.splice(currentIndex, 1)
    updatedOrder.splice(targetIndex, 0, movedModule)

    const payload = updatedOrder.map((module, index) => ({
      id: module.id,
      order_index: index,
    }))

    setReorderingModuleId(moduleId)
    startReorderModules(async () => {
      const result = await reorderModulesAction({
        course_id: courseId,
        module_orders: payload,
      })

      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || "Erro ao reordenar módulos")
      }
      setReorderingModuleId(null)
    })
  }

  // Handler para início do drag
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id)
  }

  // Handler para fim do drag
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || !isModulesEnabled) return

    const activeId = active.id as string
    const overId = over.id as string

    // Encontrar a aula sendo arrastada e o módulo de destino
    let sourceModuleIndex = -1
    let sourceLessonIndex = -1
    let targetModuleIndex = -1
    let targetModuleId: string | null = null

    // Procurar a aula no módulo de origem
    for (let i = 0; i < localModules.length; i++) {
      const lessonIndex = localModules[i].lessons.findIndex((l) => l.id === activeId)
      if (lessonIndex !== -1) {
        sourceModuleIndex = i
        sourceLessonIndex = lessonIndex
        break
      }
    }

    if (sourceModuleIndex === -1) return

    // Verificar se está sendo arrastado para outro módulo ou dentro do mesmo módulo
    if (overId.startsWith("module-")) {
      // Arrastando para um módulo
      targetModuleId = overId.replace("module-", "")
      if (targetModuleId === "null") targetModuleId = null

      // Encontrar o índice do módulo de destino
      targetModuleIndex = localModules.findIndex(
        (m) => (m.id ?? "null") === (targetModuleId ?? "null")
      )

      if (targetModuleIndex === -1) return

      // Se for o mesmo módulo, apenas reordenar
      if (sourceModuleIndex === targetModuleIndex) {
        const moduleData = localModules[sourceModuleIndex]
        const newLessons = arrayMove(moduleData.lessons, sourceLessonIndex, moduleData.lessons.length)

        const updatedModules = [...localModules]
        updatedModules[sourceModuleIndex] = {
          ...moduleData,
          lessons: newLessons.map((lesson, index) => ({
            ...lesson,
            order_index: index,
          })),
        }
        setLocalModules(updatedModules)

        // Atualizar ordem no backend
        setIsMovingLesson(true)
        const result = await moveLessonBetweenModulesAction({
          lesson_id: activeId,
          course_id: courseId,
          target_module_id: targetModuleId,
          new_order_index: newLessons.length - 1,
        })

        if (result.success) {
          router.refresh()
        } else {
          alert(result.error || "Erro ao mover aula")
          setLocalModules(modules) // Reverter
        }
        setIsMovingLesson(false)
        return
      }

      // Mover para outro módulo
      const sourceModule = localModules[sourceModuleIndex]
      const targetModule = localModules[targetModuleIndex]
      const lesson = sourceModule.lessons[sourceLessonIndex]

      // Remover da origem e adicionar ao destino
      const updatedModules = [...localModules]
      updatedModules[sourceModuleIndex] = {
        ...sourceModule,
        lessons: sourceModule.lessons.filter((l) => l.id !== activeId),
      }
      updatedModules[targetModuleIndex] = {
        ...targetModule,
        lessons: [
          ...targetModule.lessons,
          {
            ...lesson,
            order_index: targetModule.lessons.length,
          },
        ],
      }
      setLocalModules(updatedModules)

      // Atualizar no backend
      setIsMovingLesson(true)
      const result = await moveLessonBetweenModulesAction({
        lesson_id: activeId,
        course_id: courseId,
        target_module_id: targetModuleId,
        new_order_index: targetModule.lessons.length,
      })

      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || "Erro ao mover aula")
        setLocalModules(modules) // Reverter
      }
      setIsMovingLesson(false)
    } else {
      // Arrastando sobre outra aula (reordenação dentro do mesmo módulo)
      const targetLessonId = overId
      const targetModuleIndex = localModules.findIndex((m) =>
        m.lessons.some((l) => l.id === targetLessonId)
      )

      if (targetModuleIndex === -1 || targetModuleIndex !== sourceModuleIndex) return

      const moduleData = localModules[sourceModuleIndex]
      const targetLessonIndex = moduleData.lessons.findIndex((l) => l.id === targetLessonId)

      if (targetLessonIndex === -1) return

      const newLessons = arrayMove(moduleData.lessons, sourceLessonIndex, targetLessonIndex)

      const updatedModules = [...localModules]
      updatedModules[sourceModuleIndex] = {
        ...moduleData,
        lessons: newLessons.map((lesson, index) => ({
          ...lesson,
          order_index: index,
        })),
      }
      setLocalModules(updatedModules)

      // Atualizar ordem no backend
      setIsMovingLesson(true)
      const result = await moveLessonBetweenModulesAction({
        lesson_id: activeId,
        course_id: courseId,
        target_module_id: moduleData.id,
        new_order_index: targetLessonIndex,
      })

      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || "Erro ao reordenar aula")
        setLocalModules(modules) // Reverter
      }
      setIsMovingLesson(false)
    }
  }

  // Coletar todos os IDs de aulas para o SortableContext
  const allLessonIds = localModules.flatMap((module) => module.lessons.map((lesson) => lesson.id))
  const activeLesson = activeId
    ? localModules
      .flatMap((module) => module.lessons)
      .find((lesson) => lesson.id === activeId)
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <Card className="bg-[#131D37] border-slate-700">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-white text-2xl">Gerenciar Aulas</CardTitle>
                <CardDescription className="text-slate-400">
                  Organize módulos e aulas do curso&nbsp;
                  <span className="text-cyan-400">{courseTitle}</span>.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    if (!isModulesEnabled) return
                    setEditingModule(null)
                    setIsModuleDialogOpen(true)
                  }}
                  disabled={!isModulesEnabled}
                  variant="blue"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  title={!isModulesEnabled ? modulesDisabledTitle : undefined}
                >
                  <Plus className="h-4 w-4" />
                  Novo módulo
                </Button>
                <Button
                  onClick={() => openLessonDialog(activeModuleId)}
                  variant="outline"
                  className="border-cyan-500/60 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <Plus className="h-4 w-4" />
                  Nova aula
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                {allLessons.length} {allLessons.length === 1 ? "aula" : "aulas"}
              </Badge>
              <Badge className="bg-slate-800 text-slate-200 border-slate-700">
                {moduleCount} {moduleCount === 1 ? "módulo" : "módulos"}
              </Badge>
              <Badge className="bg-emerald-700/10 text-emerald-300 border-emerald-500/40">
                {videoCount} vídeo{videoCount === 1 ? "" : "s"}
              </Badge>
              <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/40">
                {upcomingCount} agendada{upcomingCount === 1 ? "" : "s"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {modules.length === 0 ? (
          <Card className="bg-[#131D37] border-slate-700">
            <CardContent className="py-12 text-center space-y-3">
              <FileText className="h-12 w-12 text-slate-600 mx-auto" />
              <p className="text-slate-400">Nenhum módulo ou aula cadastrado ainda.</p>
              <div className="flex justify-center gap-2">
                <Button
                  onClick={() => {
                    setEditingModule(null)
                    setIsModuleDialogOpen(true)
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  <Plus className="h-4 w-4" />
                  Criar módulo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openLessonDialog(null)}
                  className="border-slate-600 text-white hover:bg-slate-800"
                >
                  Adicionar aula
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Comece criando um módulo para depois organizar o conteúdo.
              </p>
            </CardContent>
          </Card>
        ) : (
          <SortableContext items={allLessonIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {localModules.map((module) => {
                const moduleOrderIndex = module.id ? moduleOrderMap.get(module.id) ?? 0 : 0
                const isFirstModule = module.id ? moduleOrderIndex === 0 : true
                const isLastModule = module.id ? moduleOrderIndex === reorderableModules.length - 1 : true
                const isReorderTarget = reorderingModuleId === module.id && isReorderingModules

                return (
                  <Card key={module.id ?? "sem-modulo"} className="bg-[#131D37] border-slate-700">
                    <CardHeader className="flex flex-col gap-3 pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg text-cyan-400 leading-tight">
                            {module.title}
                          </CardTitle>
                          <CardDescription className="text-slate-500 text-sm">
                            {module.description || (module.id === null ? "Aulas sem módulo definido" : "Módulo organizado")}
                          </CardDescription>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge
                              className={
                                module.access_type === "premium"
                                  ? "bg-amber-500/15 text-amber-200 border-amber-400/40"
                                  : "bg-emerald-500/10 text-emerald-200 border-emerald-400/30"
                              }
                            >
                              {module.access_type === "premium" ? (
                                <>
                                  <Lock className="mr-1 h-3 w-3" />
                                  Premium
                                </>
                              ) : (
                                "Gratuito"
                              )}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {module.id && (
                            <Badge className="bg-cyan-500/10 text-cyan-200 border-cyan-500/30">
                              Ordem {moduleOrderIndex + 1}
                            </Badge>
                          )}
                          <Badge className="bg-slate-800 text-slate-200 border-slate-700/50">
                            {module.lessons.length} {module.lessons.length === 1 ? "aula" : "aulas"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openLessonDialog(module.id)}
                            className="border-slate-600 text-slate-200 hover:bg-slate-800"
                          >
                            Adicionar aula
                          </Button>
                          {module.id && (
                            <>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Mover módulo para cima"
                                  onClick={() => handleReorderModule(module.id!, "up")}
                                  disabled={isFirstModule || isReorderingModules}
                                  className="text-slate-400 hover:text-white hover:bg-slate-800"
                                >
                                  {isReorderTarget ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <ArrowUp className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Mover módulo para baixo"
                                  onClick={() => handleReorderModule(module.id!, "down")}
                                  disabled={isLastModule || isReorderingModules}
                                  className="text-slate-400 hover:text-white hover:bg-slate-800"
                                >
                                  {isReorderTarget ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <ArrowDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingModule(module)
                                  setIsModuleDialogOpen(true)
                                }}
                                className="text-slate-400 hover:text-white hover:bg-slate-800"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setModuleDeleteTarget(module)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {module.lessons.length === 0 ? (
                        <DroppableModule moduleId={module.id} isEmpty={true}>
                          <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-slate-700 rounded-2xl bg-slate-900/40 p-8 text-center min-h-[120px]">
                            <p className="text-slate-400">Este módulo ainda não tem aulas.</p>
                            <Button
                              variant="outline"
                              onClick={() => openLessonDialog(module.id)}
                              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Criar primeira aula
                            </Button>
                            <p className="text-xs text-slate-500 mt-2">
                              Arraste aulas aqui para adicionar ao módulo
                            </p>
                          </div>
                        </DroppableModule>
                      ) : (
                        <DroppableModule moduleId={module.id} isEmpty={false}>
                          <SortableContext items={module.lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                            {module.lessons
                              .slice()
                              .sort((a, b) => a.order_index - b.order_index)
                              .map((lesson, index) => (
                                <SortableLesson
                                  key={lesson.id}
                                  lesson={lesson}
                                  index={index}
                                  courseDashboardHref={courseDashboardHref}
                                  onEdit={() => {
                                    setEditingLesson(lesson)
                                    setIsLessonDialogOpen(true)
                                  }}
                                  onDelete={() => setDeletingLessonId(lesson.id)}
                                />
                              ))}
                          </SortableContext>
                        </DroppableModule>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </SortableContext>
        )}

        <DragOverlay>
          {activeLesson ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#0F192F] border border-cyan-500/50 shadow-lg opacity-90">
              <GripVertical className="h-5 w-5 text-slate-400" />
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-400">
                #
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium truncate">{activeLesson.title}</h4>
              </div>
            </div>
          ) : null}
        </DragOverlay>

        <LessonFormDialog
          key={lessonDialogKey}
          open={isLessonDialogOpen}
          onOpenChange={(open) => {
            setIsLessonDialogOpen(open)
            if (!open) setEditingLesson(null)
          }}
          mode={editingLesson ? "edit" : "create"}
          courseId={courseId}
          modules={moduleOptions}
          defaultModuleId={activeModuleId}
          initialData={
            editingLesson
              ? {
                ...editingLesson,
              }
              : undefined
          }
          onSuccess={() => {
            setIsLessonDialogOpen(false)
            setEditingLesson(null)
            router.refresh()
          }}
        />

        {isModulesEnabled && (
          <ModuleFormDialog
            key={editingModule?.id ?? "new"}
            open={isModuleDialogOpen}
            onOpenChange={(open) => {
              setIsModuleDialogOpen(open)
              if (!open) setEditingModule(null)
            }}
            mode={editingModule ? "edit" : "create"}
            courseId={courseId}
            initialData={
              editingModule
                ? {
                  id: editingModule.id ?? undefined,
                  title: editingModule.title,
                  description: editingModule.description,
                  order_index: editingModule.order_index,
                  access_type: editingModule.access_type ?? undefined,
                }
                : undefined
            }
            onSuccess={() => {
              setIsModuleDialogOpen(false)
              setEditingModule(null)
              router.refresh()
            }}
          />
        )}

        <AlertDialog
          open={!!deletingLessonId}
          onOpenChange={(open) => !open && setDeletingLessonId(null)}
        >
          <AlertDialogContent className="bg-[#0F192F] border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Deletar aula?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Esta ação é permanente e remove o conteúdo da plataforma.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isDeletingLesson}
                className="border-slate-600 text-white hover:bg-slate-800"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteLesson}
                disabled={isDeletingLesson}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeletingLesson ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deletando...
                  </>
                ) : (
                  "Deletar aula"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={!!moduleDeleteTarget}
          onOpenChange={(open) => !open && setModuleDeleteTarget(null)}
        >
          <AlertDialogContent className="bg-[#0F192F] border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Excluir módulo?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                O módulo será removido e as aulas ficarão sem associação definida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isDeletingModule}
                className="border-slate-600 text-white hover:bg-slate-800"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteModule}
                disabled={isDeletingModule}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeletingModule ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Excluir módulo"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DndContext>
  )
}
