import { useTemplates } from '@/hooks/useTemplates'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function TemplatesPage(): JSX.Element {
  const { data, isLoading } = useTemplates()

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Templates</h2>
        <p className="text-muted-foreground mt-1">Modelos de avaliação de desempenho</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.data.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <Badge variant={template.isActive ? 'default' : 'secondary'}>
                    {template.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <CardDescription>v{template.version}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {template.sections.length} seções ·{' '}
                  {template.sections.reduce((acc, s) => acc + s.questions.length, 0)} perguntas
                </p>
              </CardContent>
            </Card>
          ))}
          {data?.data.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">
              Nenhum template criado ainda.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
