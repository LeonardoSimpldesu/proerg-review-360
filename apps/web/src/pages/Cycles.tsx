import { useCycles, useCycleTransition } from '@/hooks/useCycles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'
import type { CycleStatus } from '@reviews360/types'

const statusLabel: Record<CycleStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  closed: 'Fechado',
  published: 'Publicado',
}

const nextAction: Partial<Record<CycleStatus, { action: 'activate' | 'close' | 'publish'; label: string }>> = {
  draft: { action: 'activate', label: 'Ativar' },
  active: { action: 'close', label: 'Fechar' },
  closed: { action: 'publish', label: 'Publicar' },
}

export function CyclesPage(): JSX.Element {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading } = useCycles()
  const transition = useCycleTransition()

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Ciclos de Avaliação</h2>
        <p className="text-muted-foreground mt-1">Gerencie os ciclos de avaliação de desempenho</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-4">
          {data?.data.map((cycle) => {
            const action = nextAction[cycle.status]
            return (
              <Card key={cycle.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{cycle.name}</CardTitle>
                      <CardDescription>
                        Template: {cycle.template.name} · {cycle._count.assignments} assignments
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{statusLabel[cycle.status]}</Badge>
                      {user?.role === 'admin' && action && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={transition.isPending}
                          onClick={() => transition.mutate({ id: cycle.id, action: action.action })}
                        >
                          {action.label}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Início:{' '}
                    {new Date(cycle.startAt).toLocaleDateString('pt-BR')} &nbsp;·&nbsp; Fim:{' '}
                    {new Date(cycle.endAt).toLocaleDateString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            )
          })}
          {data?.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum ciclo criado ainda.</p>
          )}
        </div>
      )}
    </div>
  )
}
