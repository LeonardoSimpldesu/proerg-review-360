import { useState } from 'react'
import { ClipboardList, CalendarDays, ChevronRight } from 'lucide-react'
import { useMyAssignments } from '@/hooks/useAssignments'
import type { AssignmentStatus, AssignmentRole } from '@reviews360/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AssignmentFormModal } from '@/components/assignments/AssignmentFormModal'

// ─── Labels / variants ────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  overdue: 'Atrasado',
}

const STATUS_VARIANT: Record<AssignmentStatus, 'outline' | 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  pending: 'outline',
  in_progress: 'default',
  completed: 'success',
  overdue: 'destructive',
}

const ROLE_LABEL: Record<AssignmentRole, string> = {
  self: 'Autoavaliação',
  manager: 'Avaliação como Gestor',
  peer: 'Avaliação de Par',
}

const STATUS_FILTERS: { value: AssignmentStatus | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluídas' },
  { value: 'overdue', label: 'Atrasadas' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AssignmentsPage(): JSX.Element {
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | ''>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading } = useMyAssignments({
    status: statusFilter || undefined,
    take: 50,
  })

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Minhas Avaliações</h2>
          <p className="text-muted-foreground mt-1">Avaliações pendentes e realizadas</p>
        </div>
        {/* Status filter tabs */}
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
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

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : !data?.data.length ? (
        <div className="rounded-lg border border-dashed flex flex-col items-center justify-center py-16 gap-3">
          <ClipboardList className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {statusFilter ? 'Nenhuma avaliação com este status.' : 'Nenhuma avaliação atribuída a você ainda.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Avaliado</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Tipo</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-3">Prazo</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((a, i) => {
                const canFill = a.status !== 'completed'
                return (
                  <tr
                    key={a.id}
                    className={`border-b last:border-b-0 transition-colors hover:bg-muted/30 ${
                      i % 2 === 0 ? '' : 'bg-muted/10'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">{a.revieweeName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ROLE_LABEL[a.role]}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>{new Date(a.dueAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={STATUS_VARIANT[a.status]}>
                        {STATUS_LABEL[a.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={canFill ? 'default' : 'ghost'}
                        className="gap-1.5"
                        onClick={() => setSelectedId(a.id)}
                      >
                        {canFill ? 'Preencher' : 'Ver'}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <AssignmentFormModal
        assignmentId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}
