import type { ReviewTemplateDto } from '@reviews360/types'
import { Hash, Text, ListChecks } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const QUESTION_TYPE_LABEL: Record<string, { label: string; Icon: typeof Hash }> = {
  rating: { label: 'Nota', Icon: Hash },
  text: { label: 'Texto', Icon: Text },
  choice: { label: 'Escolha', Icon: ListChecks },
}

interface Props {
  open: boolean
  onClose: () => void
  template: ReviewTemplateDto | null
}

export function TemplateDetailModal({ open, onClose, template }: Props): JSX.Element {
  if (!template) return <></>

  const totalQuestions = template.sections.reduce((acc, s) => acc + s.questions.length, 0)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-6">
            <div className="flex-1">
              <DialogTitle className="text-xl">{template.name}</DialogTitle>
              <DialogDescription className="mt-1">
                v{template.version} · {template.sections.length} seções · {totalQuestions} perguntas
              </DialogDescription>
            </div>
            <Badge variant={template.isActive ? 'default' : 'secondary'}>
              {template.isActive ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-6">
          {template.sections.map((section, si) => (
            <div key={section.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                  {si + 1}
                </span>
                <h3 className="font-semibold text-sm">{section.title}</h3>
                <span className="text-xs text-muted-foreground ml-auto">
                  {section.questions.length} pergunta{section.questions.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="ml-8 space-y-2">
                {section.questions.map((q, qi) => {
                  const typeInfo = QUESTION_TYPE_LABEL[q.type] ?? QUESTION_TYPE_LABEL['text']
                  const Icon = typeInfo.Icon
                  return (
                    <div
                      key={q.id}
                      className="flex items-start gap-3 rounded-md border bg-muted/20 px-3 py-2.5"
                    >
                      <span className="text-xs text-muted-foreground mt-0.5 w-4 shrink-0 text-right">
                        {qi + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{q.text}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {q.type === 'rating' && q.scaleMin != null && q.scaleMax != null && (
                          <span className="text-xs text-muted-foreground">
                            {q.scaleMin}–{q.scaleMax}
                          </span>
                        )}
                        <div className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{typeInfo.label}</span>
                        </div>
                        {!q.required && (
                          <span className="text-xs text-muted-foreground">opcional</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {si < template.sections.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
