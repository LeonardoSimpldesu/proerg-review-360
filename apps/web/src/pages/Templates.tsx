import { useState } from 'react'
import { Plus, Eye, Pencil, Power, PowerOff } from 'lucide-react'
import { useTemplates, useToggleTemplateActive } from '@/hooks/useTemplates'
import { useAuthStore } from '@/stores/auth.store'
import type { ReviewTemplateDto } from '@reviews360/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TemplateFormModal } from '@/components/templates/TemplateFormModal'
import { TemplateDetailModal } from '@/components/templates/TemplateDetailModal'

export function TemplatesPage(): JSX.Element {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const { data, isLoading } = useTemplates({ take: 50 })
  const toggleActive = useToggleTemplateActive()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ReviewTemplateDto | null>(null)
  const [detailTarget, setDetailTarget] = useState<ReviewTemplateDto | null>(null)

  function openCreate(): void {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(t: ReviewTemplateDto): void {
    setEditTarget(t)
    setFormOpen(true)
  }

  function closeForm(): void {
    setFormOpen(false)
    setEditTarget(null)
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Templates</h2>
          <p className="text-muted-foreground mt-1">Modelos de avaliação de desempenho</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo template
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-lg border">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
              <div className="h-4 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : !data?.data.length ? (
        <div className="rounded-lg border border-dashed flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-muted-foreground">Nenhum template criado ainda.</p>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar primeiro template
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Nome</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-3">Versão</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-3">Seções</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-3">Perguntas</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((template, i) => {
                const totalQuestions = template.sections.reduce(
                  (acc, s) => acc + s.questions.length,
                  0
                )
                const isToggling =
                  toggleActive.isPending && toggleActive.variables?.id === template.id

                return (
                  <tr
                    key={template.id}
                    className={`border-b last:border-b-0 transition-colors hover:bg-muted/30 ${
                      i % 2 === 0 ? '' : 'bg-muted/10'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">{template.name}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">v{template.version}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {template.sections.length}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{totalQuestions}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={template.isActive ? 'default' : 'secondary'}>
                        {template.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Visualizar"
                          onClick={() => setDetailTarget(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Editar"
                            onClick={() => openEdit(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}

                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${
                              template.isActive
                                ? 'text-destructive hover:text-destructive'
                                : 'text-green-600 hover:text-green-600'
                            }`}
                            title={template.isActive ? 'Desativar' : 'Ativar'}
                            disabled={isToggling}
                            onClick={() =>
                              toggleActive.mutate({ id: template.id, isActive: !template.isActive })
                            }
                          >
                            {template.isActive ? (
                              <PowerOff className="h-4 w-4" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <TemplateFormModal open={formOpen} onClose={closeForm} template={editTarget} />
      <TemplateDetailModal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        template={detailTarget}
      />
    </div>
  )
}
