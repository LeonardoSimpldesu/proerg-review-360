import { useAuthStore } from '@/stores/auth.store'
import { useCycles } from '@/hooks/useCycles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CycleStatus } from '@reviews360/types'

const statusLabel: Record<CycleStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  closed: 'Fechado',
  published: 'Publicado',
}

const statusVariant: Record<CycleStatus, 'outline' | 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  draft: 'outline',
  active: 'default',
  closed: 'warning',
  published: 'success',
}

export function DashboardPage(): JSX.Element {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading } = useCycles({ take: 5 })

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Bom dia, {user?.name?.split(' ')[0]}
        </h2>
        <p className="text-muted-foreground mt-1">Visão geral dos ciclos de avaliação</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de ciclos</CardDescription>
            <CardTitle className="text-3xl">{data?.total ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ciclos ativos</CardDescription>
            <CardTitle className="text-3xl">
              {data?.data.filter((c) => c.status === 'active').length ?? '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ciclos publicados</CardDescription>
            <CardTitle className="text-3xl">
              {data?.data.filter((c) => c.status === 'published').length ?? '—'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recent cycles */}
      <Card>
        <CardHeader>
          <CardTitle>Ciclos Recentes</CardTitle>
          <CardDescription>Últimos ciclos de avaliação</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : data?.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum ciclo criado ainda.</p>
          ) : (
            <div className="space-y-3">
              {data?.data.map((cycle) => (
                <div
                  key={cycle.id}
                  className="flex items-center justify-between p-3 rounded-md border"
                >
                  <div>
                    <p className="font-medium text-sm">{cycle.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cycle.template.name} · {cycle._count.assignments} assignments
                    </p>
                  </div>
                  <Badge variant={statusVariant[cycle.status]}>
                    {statusLabel[cycle.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
