import { useEffect, useState } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createTemplateSchema } from '@reviews360/zod-schemas'
import type { z } from 'zod'
import type { ReviewTemplateDto } from '@reviews360/types'
import { Plus, Trash2, GripVertical, X } from 'lucide-react'
import { useCreateTemplate, useUpdateTemplate } from '@/hooks/useTemplates'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

type FormValues = z.infer<typeof createTemplateSchema>

interface Props {
  open: boolean
  onClose: () => void
  template?: ReviewTemplateDto | null
}

const DEFAULT_SECTION: FormValues['sections'][number] = {
  title: '',
  order: 0,
  questions: [{ type: 'rating', text: '', scaleMin: 1, scaleMax: 5, options: undefined, required: true, order: 0 }],
}

function OptionsInput({
  control,
  sectionIndex,
  questionIndex,
}: {
  control: ReturnType<typeof useForm<FormValues>>['control']
  sectionIndex: number
  questionIndex: number
}): JSX.Element {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `sections.${sectionIndex}.questions.${questionIndex}.options` as never,
  })
  const [newOption, setNewOption] = useState('')

  function addOption() {
    const val = newOption.trim()
    if (!val) return
    append(val as never)
    setNewOption('')
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">Opções:</span>
      <div className="flex flex-wrap gap-1.5">
        {fields.map((f, i) => (
          <span
            key={f.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs"
          >
            <Controller
              control={control}
              name={`sections.${sectionIndex}.questions.${questionIndex}.options.${i}` as never}
              render={({ field }) => <span>{field.value as string}</span>}
            />
            <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          className="h-7 text-xs flex-1"
          placeholder="Nova opção..."
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
        />
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={addOption}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

function QuestionFields({
  sectionIndex,
  control,
  register,
  errors,
}: {
  sectionIndex: number
  control: ReturnType<typeof useForm<FormValues>>['control']
  register: ReturnType<typeof useForm<FormValues>>['register']
  errors: ReturnType<typeof useForm<FormValues>>['formState']['errors']
}): JSX.Element {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `sections.${sectionIndex}.questions`,
  })

  return (
    <div className="space-y-2">
      {fields.map((q, qi) => {
        const qErrors = errors.sections?.[sectionIndex]?.questions?.[qi]
        return (
          <div key={q.id} className="rounded-md border bg-muted/30 p-3 space-y-3">
            <div className="flex items-start gap-2">
              <GripVertical className="h-4 w-4 mt-2 text-muted-foreground shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  {/* Question type */}
                  <div className="w-36 shrink-0">
                    <Controller
                      control={control}
                      name={`sections.${sectionIndex}.questions.${qi}.type`}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rating">Nota (1-5)</SelectItem>
                            <SelectItem value="text">Texto</SelectItem>
                            <SelectItem value="choice">Escolha</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {/* Question text */}
                  <div className="flex-1">
                    <Input
                      className="h-9 text-sm"
                      placeholder="Texto da pergunta"
                      {...register(`sections.${sectionIndex}.questions.${qi}.text`)}
                    />
                    {qErrors?.text && (
                      <p className="text-xs text-destructive mt-1">{qErrors.text.message}</p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => remove(qi)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Scale fields (rating only) / Options (choice only) */}
                <Controller
                  control={control}
                  name={`sections.${sectionIndex}.questions.${qi}.type`}
                  render={({ field: typeField }) => {
                    if (typeField.value === 'rating') {
                      return (
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">Escala:</span>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              className="h-7 w-14 text-xs text-center"
                              {...register(`sections.${sectionIndex}.questions.${qi}.scaleMin`, {
                                valueAsNumber: true,
                              })}
                            />
                            <span className="text-xs text-muted-foreground">até</span>
                            <Input
                              type="number"
                              className="h-7 w-14 text-xs text-center"
                              {...register(`sections.${sectionIndex}.questions.${qi}.scaleMax`, {
                                valueAsNumber: true,
                              })}
                            />
                          </div>
                        </div>
                      )
                    }
                    if (typeField.value === 'choice') {
                      return (
                        <OptionsInput
                          control={control}
                          sectionIndex={sectionIndex}
                          questionIndex={qi}
                        />
                      )
                    }
                    return <></>
                  }}
                />

                {/* Required toggle */}
                <Controller
                  control={control}
                  name={`sections.${sectionIndex}.questions.${qi}.required`}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <span className="text-xs text-muted-foreground">Obrigatória</span>
                    </label>
                  )}
                />
              </div>
            </div>
          </div>
        )
      })}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs h-8 gap-1"
        onClick={() =>
          append({ type: 'rating', text: '', scaleMin: 1, scaleMax: 5, options: undefined, required: true, order: fields.length })
        }
      >
        <Plus className="h-3 w-3" />
        Adicionar pergunta
      </Button>
    </div>
  )
}

export function TemplateFormModal({ open, onClose, template }: Props): JSX.Element {
  const isEdit = !!template
  const createMutation = useCreateTemplate()
  const updateMutation = useUpdateTemplate()
  const isPending = createMutation.isPending || updateMutation.isPending
  const mutationError = (createMutation.error ?? updateMutation.error) as { response?: { data?: { message?: string } } } | null
  const errorMessage = mutationError?.response?.data?.message ?? null

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: { name: '', sections: [DEFAULT_SECTION] },
  })

  const { fields: sections, append: addSection, remove: removeSection } = useFieldArray({
    control,
    name: 'sections',
  })

  // Populate form when editing; clear mutation errors on every open
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    createMutation.reset()
    updateMutation.reset()
    if (template) {
      reset({
        name: template.name,
        sections: template.sections.map((s) => ({
          title: s.title,
          order: s.order,
          questions: s.questions.map((q) => ({
            type: q.type as 'rating' | 'text' | 'choice',
            text: q.text,
            scaleMin: q.scaleMin ?? 1,
            scaleMax: q.scaleMax ?? 5,
            options: q.options ?? undefined,
            required: q.required,
            order: q.order,
          })),
        })),
      })
    } else {
      reset({ name: '', sections: [DEFAULT_SECTION] })
    }
  }, [template, reset, open])

  function onSubmit(values: FormValues): void {
    // Auto-assign order by position
    const payload = {
      ...values,
      sections: values.sections.map((s, si) => ({
        ...s,
        order: si,
        questions: s.questions.map((q, qi) => ({ ...q, order: qi })),
      })),
    }

    if (isEdit && template) {
      updateMutation.mutate(
        { id: template.id, data: payload },
        { onSuccess: onClose }
      )
    } else {
      createMutation.mutate(payload, { onSuccess: onClose })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar template' : 'Novo template'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Template name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome do template</Label>
            <Input id="name" placeholder="Ex: Avaliação Semestral 2025" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <Separator />

          {/* Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Seções</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() =>
                  addSection({ title: '', order: sections.length, questions: [{ type: 'rating', text: '', scaleMin: 1, scaleMax: 5, options: undefined, required: true, order: 0 }] })
                }
              >
                <Plus className="h-3 w-3" />
                Seção
              </Button>
            </div>

            {sections.map((section, si) => (
              <div
                key={section.id}
                className={cn('rounded-lg border p-4 space-y-4', errors.sections?.[si] && 'border-destructive')}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">
                    Seção {si + 1}
                  </span>
                  <Input
                    className="h-8 text-sm"
                    placeholder="Título da seção"
                    {...register(`sections.${si}.title`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeSection(si)}
                    disabled={sections.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {errors.sections?.[si]?.title && (
                  <p className="text-xs text-destructive">{errors.sections[si]!.title!.message}</p>
                )}

                <QuestionFields
                  sectionIndex={si}
                  control={control}
                  register={register}
                  errors={errors}
                />
              </div>
            ))}

            {errors.sections?.root && (
              <p className="text-sm text-destructive">{errors.sections.root.message}</p>
            )}
          </div>

          <DialogFooter>
            {errorMessage && (
              <p className="text-sm text-destructive mr-auto">{errorMessage}</p>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
