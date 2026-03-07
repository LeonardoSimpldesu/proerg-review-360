import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useAuthStore } from '@/stores/auth.store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ReviewAssignmentDto, PaginatedResult, AssignmentStatus } from '@reviews360/types'

const statusLabel: Record<AssignmentStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  overdue: 'Atrasado',
}

const statusVariant: Record<AssignmentStatus, 'outline' | 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  pending: 'outline',
  in_progress: 'default',
  completed: 'success',
  overdue: 'destructive',
}

export function AssignmentsPage(): JSX.Element {
  const employeeId = useAuthStore((s) => s.user)

  const { data, isLoading } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: () =>
      api
        .get<PaginatedResult<ReviewAssignmentDto>>('/cycles/assignments', {
          params: { take: 20, skip: 0 },
        })
        .then((r) => r.data),
    enabled: !!employeeId,
  })

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Minhas Tarefas</h2>
        <p className="text-muted-foreground mt-1">Avaliações pendentes e em andamento</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-3">
          {data?.data.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Avaliação — papel: {a.role}
                  </CardTitle>
                  <Badge variant={statusVariant[a.status]}>{statusLabel[a.status]}</Badge>
                </div>
                <CardDescription>
                  Prazo: {new Date(a.dueAt).toLocaleDateString('pt-BR')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-xs text-muted-foreground">
                  {a.isAnonymous ? 'Avaliação anônima' : 'Avaliação identificada'}
                </p>
              </CardContent>
            </Card>
          ))}
          {(!data || data.data.length === 0) && (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente.</p>
          )}
        </div>
      )}
    </div>
  )
}
