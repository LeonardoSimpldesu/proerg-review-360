import { useState } from 'react'
import { Plus, Eye, CalendarDays, Users } from 'lucide-react'
import { useCycles } from '@/hooks/useCycles'
import { useAuthStore } from '@/stores/auth.store'
import type { ReviewCycleDetailDto, CycleStatus } from '@reviews360/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CycleFormWizard } from '@/components/cycles/CycleFormWizard'
import { CycleDetailModal } from '@/components/cycles/CycleDetailModal'

const STATUS_LABEL: Record<CycleStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  closed: 'Fechado',
  published: 'Publicado',
}

const STATUS_VARIANT: Record<CycleStatus, 'outline' | 'default' | 'warning' | 'success' | 'secondary'> = {
  draft: 'outline',
  active: 'default',
  closed: 'warning',
  published: 'success',
}

export function CyclesPage(): JSX.Element {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const { data, isLoading } = useCycles({ take: 50 })

  const [wizardOpen, setWizardOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<ReviewCycleDetailDto | null>(null)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ciclos de Avaliação</h2>
          <p className="text-muted-foreground mt-1">Gerencie os ciclos de avaliação de desempenho</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setWizardOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo ciclo
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="rounded-lg border">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
              <div className="h-4 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : !data?.data.length ? (
        <div className="rounded-lg border border-dashed flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-muted-foreground">Nenhum ciclo criado ainda.</p>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar primeiro ciclo
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Nome</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Template</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-3">Período</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-3">Avaliações</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((cycle, i) => (
                <tr
                  key={cycle.id}
                  className={`border-b last:border-b-0 transition-colors hover:bg-muted/30 ${
                    i % 2 === 0 ? '' : 'bg-muted/10'
                  }`}
                >
                  <td className="px-4 py-3 font-medium">{cycle.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {cycle.template.name}
                    <span className="ml-1 text-xs">v{cycle.template.version}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>
                        {new Date(cycle.startAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        {' – '}
                        {new Date(cycle.endAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{cycle._count.assignments}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={STATUS_VARIANT[cycle.status]}>
                      {STATUS_LABEL[cycle.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Ver detalhes"
                      onClick={() => setDetailTarget(cycle)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CycleFormWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
      <CycleDetailModal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        cycle={detailTarget}
      />
    </div>
  )
}
