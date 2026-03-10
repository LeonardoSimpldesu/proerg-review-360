import { useEffect, useState } from 'react'
import { useAssignmentDetail, useSaveDraft, useSubmitAssignment } from '@/hooks/useAssignments'
import type { AssignmentRole } from '@reviews360/types'
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

// ─── Labels ───────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<AssignmentRole, string> = {
  self: 'Autoavaliação',
  manager: 'Avaliação pelo Gestor',
  peer: 'Avaliação por Par',
}

// ─── Answer state ─────────────────────────────────────────────────────────────

interface AnswerState {
  questionId: string
  ratingValue?: number
  textValue?: string
}

function buildInitialAnswers(
  sections: { questions: { id: string }[] }[],
  existing: { questionId: string; ratingValue: number | null; textValue: string | null }[] | undefined
): AnswerState[] {
  return sections.flatMap((s) =>
    s.questions.map((q) => {
      const found = existing?.find((a) => a.questionId === q.id)
      return {
        questionId: q.id,
        ratingValue: found?.ratingValue ?? undefined,
        textValue: found?.textValue ?? undefined,
      }
    })
  )
}

// ─── Rating input ─────────────────────────────────────────────────────────────

function RatingInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number | undefined
  min: number
  max: number
  onChange: (v: number) => void
}) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => i + min)
  return (
    <div className="flex gap-1.5 flex-wrap">
      {steps.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-md border text-sm font-medium transition-colors ${
            value === n
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-input hover:bg-muted'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  assignmentId: string | null
  onClose: () => void
}

export function AssignmentFormModal({ assignmentId, onClose }: Props): JSX.Element {
  const { data, isLoading } = useAssignmentDetail(assignmentId)
  const saveDraft = useSaveDraft()
  const submitMutation = useSubmitAssignment()

  const [answers, setAnswers] = useState<AnswerState[]>([])
  const [overallComment, setOverallComment] = useState('')

  // Seed answers when detail loads
  useEffect(() => {
    if (!data) return
    setAnswers(buildInitialAnswers(data.template.sections, data.response?.answers))
    setOverallComment(data.response?.overallComment ?? '')
  }, [data])

  function setAnswer(questionId: string, patch: Partial<AnswerState>) {
    setAnswers((prev) =>
      prev.map((a) => (a.questionId === questionId ? { ...a, ...patch } : a))
    )
  }

  function buildBody() {
    return {
      overallComment: overallComment || undefined,
      answers: answers,
    }
  }

  async function handleSave() {
    if (!assignmentId) return
    await saveDraft.mutateAsync({ id: assignmentId, body: buildBody() })
  }

  async function handleSubmit() {
    if (!assignmentId) return
    await submitMutation.mutateAsync({ id: assignmentId, body: buildBody() })
    onClose()
  }

  const isCompleted = data?.status === 'completed'
  const isBusy = saveDraft.isPending || submitMutation.isPending

  return (
    <Dialog open={!!assignmentId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl">
                {data ? ROLE_LABEL[data.role] : 'Carregando...'}
              </DialogTitle>
              {data && isCompleted && (
                <Badge variant="success">Concluído</Badge>
              )}
            </div>
            {data && (
              <DialogDescription>
                Ciclo: {data.cycleName} · Avaliado: {data.revieweeName} · Prazo:{' '}
                {new Date(data.dueAt).toLocaleDateString('pt-BR')}
              </DialogDescription>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <div className="space-y-6">
            {data.template.sections.map((section) => (
              <div key={section.id} className="space-y-4">
                <div>
                  <p className="font-semibold text-sm">{section.title}</p>
                  <Separator className="mt-2" />
                </div>

                {section.questions.map((question) => {
                  const answer = answers.find((a) => a.questionId === question.id)
                  return (
                    <div key={question.id} className="space-y-2">
                      <p className="text-sm">
                        {question.text}
                        {question.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </p>

                      {question.type === 'rating' ? (
                        <div className="space-y-1">
                          <RatingInput
                            value={answer?.ratingValue}
                            min={question.scaleMin ?? 1}
                            max={question.scaleMax ?? 5}
                            onChange={(v) =>
                              !isCompleted && setAnswer(question.id, { ratingValue: v })
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            {question.scaleMin ?? 1} = mínimo · {question.scaleMax ?? 5} = máximo
                          </p>
                        </div>
                      ) : question.type === 'choice' && question.options?.length ? (
                        <div className="flex flex-col gap-2">
                          {question.options.map((opt) => (
                            <label
                              key={opt}
                              className={`flex items-center gap-2.5 cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors ${
                                answer?.textValue === opt
                                  ? 'border-primary bg-primary/5'
                                  : 'border-input hover:bg-muted/50'
                              } ${isCompleted ? 'cursor-default opacity-70' : ''}`}
                            >
                              <input
                                type="radio"
                                className="accent-primary"
                                disabled={isCompleted}
                                checked={answer?.textValue === opt}
                                onChange={() => setAnswer(question.id, { textValue: opt })}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <textarea
                          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                          placeholder="Sua resposta..."
                          disabled={isCompleted}
                          value={answer?.textValue ?? ''}
                          onChange={(e) =>
                            setAnswer(question.id, { textValue: e.target.value })
                          }
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Overall comment */}
            <div className="space-y-2">
              <Separator />
              <p className="font-semibold text-sm">Comentário geral</p>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder="Observações gerais sobre o avaliado (opcional)..."
                disabled={isCompleted}
                value={overallComment}
                onChange={(e) => setOverallComment(e.target.value)}
              />
            </div>

            {/* Actions */}
            {!isCompleted && (
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  disabled={isBusy}
                  onClick={handleSave}
                >
                  {saveDraft.isPending ? 'Salvando...' : 'Salvar rascunho'}
                </Button>
                <Button disabled={isBusy} onClick={handleSubmit}>
                  {submitMutation.isPending ? 'Enviando...' : 'Enviar avaliação'}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
