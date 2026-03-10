import { useState } from 'react'
import { CalendarDays, Users, CheckCircle2, Clock, AlertCircle, Circle } from 'lucide-react'
import { useCycleAssignments, useCycleTransition } from '@/hooks/useCycles'
import { useAuthStore } from '@/stores/auth.store'
import type { ReviewCycleDetailDto, CycleStatus, AssignmentStatus, AssignmentRole } from '@reviews360/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// ─── Labels / variants ───────────────────────────────────────────────────────

const CYCLE_STATUS_LABEL: Record<CycleStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  closed: 'Fechado',
  published: 'Publicado',
}

const CYCLE_STATUS_VARIANT: Record<CycleStatus, 'outline' | 'default' | 'warning' | 'success' | 'secondary'> = {
  draft: 'outline',
  active: 'default',
  closed: 'warning',
  published: 'success',
}

const ASSIGNMENT_STATUS_ICON: Record<AssignmentStatus, React.ReactNode> = {
  pending: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
  in_progress: <Clock className="h-3.5 w-3.5 text-blue-500" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  overdue: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
}

const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  overdue: 'Atrasado',
}

const ROLE_LABEL: Record<AssignmentRole, string> = {
  self: 'Auto',
  manager: 'Gestor',
  peer: 'Par',
}

const NEXT_TRANSITION: Partial<Record<CycleStatus, { action: 'activate' | 'close' | 'publish'; label: string; variant: 'default' | 'destructive' | 'outline' }>> = {
  draft: { action: 'activate', label: 'Ativar ciclo', variant: 'default' },
  active: { action: 'close', label: 'Fechar ciclo', variant: 'outline' },
  closed: { action: 'publish', label: 'Publicar resultados', variant: 'default' },
}

// ─── Status filter tabs ───────────────────────────────────────────────────────

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluídos' },
  { value: 'overdue', label: 'Atrasados' },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  cycle: ReviewCycleDetailDto | null
}

export function CycleDetailModal({ open, onClose, cycle }: Props): JSX.Element {
  const [statusFilter, setStatusFilter] = useState('')
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const transition = useCycleTransition()

  const { data: assignmentsData, isLoading: loadingAssignments } = useCycleAssignments(
    cycle?.id ?? '',
    { status: statusFilter || undefined, take: 100 }
  )

  if (!cycle) return <></>

  const nextTransition = NEXT_TRANSITION[cycle.status]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between pr-6">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{cycle.name}</DialogTitle>
              <DialogDescription>
                Template: {cycle.template.name} v{cycle.template.version}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={CYCLE_STATUS_VARIANT[cycle.status]}>
                {CYCLE_STATUS_LABEL[cycle.status]}
              </Badge>
              {isAdmin && nextTransition && (
                <Button
                  size="sm"
                  variant={nextTransition.variant}
                  disabled={transition.isPending}
                  onClick={() => transition.mutate({ id: cycle.id, action: nextTransition.action })}
                >
                  {transition.isPending && transition.variables?.id === cycle.id
                    ? 'Aguarde...'
                    : nextTransition.label}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Meta info */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            <span>
              {new Date(cycle.startAt).toLocaleDateString('pt-BR')}
              {' — '}
              {new Date(cycle.endAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{cycle._count.assignments} avaliações</span>
          </div>
        </div>

        <Separator />

        {/* Assignments section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">Avaliações</p>
            {/* Status filter tabs */}
            <div className="flex gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    statusFilter === f.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loadingAssignments ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : !assignmentsData?.data.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma avaliação{statusFilter ? ' com este status' : ''}.
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left font-medium text-muted-foreground px-3 py-2.5">Avaliado</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2.5">Avaliador</th>
                    <th className="text-center font-medium text-muted-foreground px-3 py-2.5">Tipo</th>
                    <th className="text-center font-medium text-muted-foreground px-3 py-2.5">Prazo</th>
                    <th className="text-center font-medium text-muted-foreground px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignmentsData.data.map((a) => (
                    <tr key={a.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 font-medium">{a.revieweeName}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {a.reviewerName ?? (
                          <span className="italic text-xs">Anônimo</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant="secondary" className="text-xs">
                          {ROLE_LABEL[a.role]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center text-muted-foreground text-xs">
                        {new Date(a.dueAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {ASSIGNMENT_STATUS_ICON[a.status]}
                          <span className="text-xs">{ASSIGNMENT_STATUS_LABEL[a.status]}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
