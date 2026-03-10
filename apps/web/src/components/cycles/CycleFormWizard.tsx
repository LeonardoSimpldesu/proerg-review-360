import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, ChevronRight, ChevronLeft, Users } from 'lucide-react'
import { useCreateCycle } from '@/hooks/useCycles'
import { useTemplates } from '@/hooks/useTemplates'
import { useEmployees } from '@/hooks/useEmployees'
import type { EmployeeWithUserDto } from '@reviews360/types'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(1, 'Campo obrigatório'),
  templateId: z.string().min(1, 'Selecione um template'),
  startAt: z.string().min(1, 'Campo obrigatório'),
  endAt: z.string().min(1, 'Campo obrigatório'),
  defaultDueAt: z.string().min(1, 'Campo obrigatório'),
})

type Step1Values = z.infer<typeof step1Schema>

// ─── Participant group (local state, not sent directly to API) ────────────────

interface ParticipantGroup {
  localId: string
  revieweeEmployeeId: string
  hasSelf: boolean
  hasManager: boolean
  peers: string[]
  peersAnonymous: boolean
  dueAt: string
}

function toIso(date: string, endOfDay = false): string {
  return `${date}T${endOfDay ? '23:59:59' : '00:00:00'}.000Z`
}

function expandGroups(groups: ParticipantGroup[], employees: EmployeeWithUserDto[]) {
  const rows: Array<{
    revieweeEmployeeId: string
    reviewerEmployeeId: string
    role: 'self' | 'manager' | 'peer'
    isAnonymous: boolean
    dueAt: string
  }> = []

  for (const g of groups) {
    const emp = employees.find((e) => e.id === g.revieweeEmployeeId)
    const dueAt = toIso(g.dueAt, true)

    if (g.hasSelf) {
      rows.push({ revieweeEmployeeId: g.revieweeEmployeeId, reviewerEmployeeId: g.revieweeEmployeeId, role: 'self', isAnonymous: false, dueAt })
    }
    if (g.hasManager && emp?.managerId) {
      rows.push({ revieweeEmployeeId: g.revieweeEmployeeId, reviewerEmployeeId: emp.managerId, role: 'manager', isAnonymous: false, dueAt })
    }
    for (const peerId of g.peers) {
      rows.push({ revieweeEmployeeId: g.revieweeEmployeeId, reviewerEmployeeId: peerId, role: 'peer', isAnonymous: g.peersAnonymous, dueAt })
    }
  }
  return rows
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 }): JSX.Element {
  return (
    <div className="flex items-center gap-2 text-sm">
      {[1, 2].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
            n === current
              ? 'bg-primary text-primary-foreground'
              : n < current
              ? 'bg-green-500 text-white'
              : 'bg-muted text-muted-foreground'
          }`}>
            {n}
          </span>
          <span className={n === current ? 'font-medium' : 'text-muted-foreground'}>
            {n === 1 ? 'Informações' : 'Participantes'}
          </span>
          {n < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      ))}
    </div>
  )
}

// ─── Participant row ──────────────────────────────────────────────────────────

function ParticipantGroupRow({
  group,
  employees,
  onChange,
  onRemove,
  usedEmployeeIds,
}: {
  group: ParticipantGroup
  employees: EmployeeWithUserDto[]
  onChange: (updated: ParticipantGroup) => void
  onRemove: () => void
  usedEmployeeIds: string[]
}): JSX.Element {
  const reviewee = employees.find((e) => e.id === group.revieweeEmployeeId)
  const manager = reviewee?.managerId
    ? employees.find((e) => e.id === reviewee.managerId)
    : null
  const availablePeers = employees.filter(
    (e) => e.id !== group.revieweeEmployeeId
  )

  function update(partial: Partial<ParticipantGroup>): void {
    onChange({ ...group, ...partial })
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      {/* Header: reviewee selector + remove */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select
            value={group.revieweeEmployeeId}
            onValueChange={(v) => update({ revieweeEmployeeId: v, hasSelf: false, hasManager: false, peers: [] })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione o avaliado..." />
            </SelectTrigger>
            <SelectContent>
              {employees
                .filter((e) => !usedEmployeeIds.includes(e.id) || e.id === group.revieweeEmployeeId)
                .map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.user.name}
                    <span className="ml-1 text-muted-foreground text-xs">— {e.jobTitle}</span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {group.revieweeEmployeeId && (
        <>
          {/* Review types */}
          <div className="grid grid-cols-2 gap-3">
            {/* Self */}
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={group.hasSelf}
                onCheckedChange={(v) => update({ hasSelf: !!v })}
              />
              <div>
                <p className="text-sm font-medium">Autoavaliação</p>
                <p className="text-xs text-muted-foreground">O próprio colaborador</p>
              </div>
            </label>

            {/* Manager */}
            <label className={`flex items-center gap-2 ${manager ? 'cursor-pointer' : 'opacity-50'}`}>
              <Checkbox
                checked={group.hasManager}
                disabled={!manager}
                onCheckedChange={(v) => update({ hasManager: !!v })}
              />
              <div>
                <p className="text-sm font-medium">Gestor</p>
                <p className="text-xs text-muted-foreground">
                  {manager ? manager.user.name : 'Sem gestor cadastrado'}
                </p>
              </div>
            </label>
          </div>

          {/* Peers */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Pares</p>
            <div className="max-h-36 overflow-y-auto space-y-1 rounded-md border p-2">
              {availablePeers.map((peer) => (
                <label key={peer.id} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-muted/50">
                  <Checkbox
                    checked={group.peers.includes(peer.id)}
                    onCheckedChange={(v) =>
                      update({
                        peers: v
                          ? [...group.peers, peer.id]
                          : group.peers.filter((p) => p !== peer.id),
                      })
                    }
                  />
                  <span className="text-sm">{peer.user.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{peer.jobTitle}</span>
                </label>
              ))}
              {availablePeers.length === 0 && (
                <p className="text-xs text-muted-foreground p-1">Nenhum par disponível</p>
              )}
            </div>

            {group.peers.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={group.peersAnonymous}
                  onCheckedChange={(v) => update({ peersAnonymous: !!v })}
                />
                <span className="text-sm text-muted-foreground">Avaliação de pares anônima</span>
              </label>
            )}
          </div>

          {/* Due date */}
          <div className="flex items-center gap-3">
            <Label className="text-sm shrink-0">Prazo</Label>
            <Input
              type="date"
              className="h-8 w-44 text-sm"
              value={group.dueAt}
              onChange={(e) => update({ dueAt: e.target.value })}
            />
          </div>

          {/* Summary badges */}
          {(group.hasSelf || group.hasManager || group.peers.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {group.hasSelf && <Badge variant="secondary" className="text-xs">Auto</Badge>}
              {group.hasManager && <Badge variant="secondary" className="text-xs">Gestor</Badge>}
              {group.peers.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {group.peers.length} par{group.peers.length !== 1 ? 'es' : ''}
                  {group.peersAnonymous ? ' (anôn.)' : ''}
                </Badge>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
}

export function CycleFormWizard({ open, onClose }: Props): JSX.Element {
  const [step, setStep] = useState<1 | 2>(1)
  const [groups, setGroups] = useState<ParticipantGroup[]>([])
  const [step2Error, setStep2Error] = useState('')

  const createCycle = useCreateCycle()
  const { data: templatesData } = useTemplates({ take: 100 })
  const { data: employeesData } = useEmployees({ take: 100 })

  const activeTemplates = templatesData?.data.filter((t) => t.isActive) ?? []
  const employees = employeesData?.data ?? []

  const {
    register,
    control,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: '', templateId: '', startAt: '', endAt: '', defaultDueAt: '' },
  })

  function handleClose(): void {
    setStep(1)
    setGroups([])
    setStep2Error('')
    onClose()
  }

  async function goToStep2(): Promise<void> {
    const ok = await trigger()
    if (ok) setStep(2)
  }

  function addGroup(): void {
    const defaultDueAt = getValues('defaultDueAt') || getValues('endAt') || ''
    setGroups((prev) => [
      ...prev,
      { localId: Math.random().toString(36).slice(2), revieweeEmployeeId: '', hasSelf: false, hasManager: false, peers: [], peersAnonymous: false, dueAt: defaultDueAt },
    ])
  }

  function updateGroup(localId: string, updated: ParticipantGroup): void {
    setGroups((prev) => prev.map((g) => (g.localId === localId ? updated : g)))
  }

  function removeGroup(localId: string): void {
    setGroups((prev) => prev.filter((g) => g.localId !== localId))
  }

  function onSubmit(step1: Step1Values): void {
    const filledGroups = groups.filter((g) => g.revieweeEmployeeId)
    if (filledGroups.length === 0) {
      setStep2Error('Adicione ao menos um participante com avaliado selecionado.')
      return
    }
    const hasAnyReview = filledGroups.some((g) => g.hasSelf || g.hasManager || g.peers.length > 0)
    if (!hasAnyReview) {
      setStep2Error('Cada avaliado precisa ter ao menos um tipo de avaliação selecionado.')
      return
    }
    setStep2Error('')

    const participants = expandGroups(filledGroups, employees)

    createCycle.mutate(
      {
        name: step1.name,
        templateId: step1.templateId,
        startAt: toIso(step1.startAt),
        endAt: toIso(step1.endAt, true),
        participants,
      },
      { onSuccess: handleClose }
    )
  }

  const usedEmployeeIds = groups.map((g) => g.revieweeEmployeeId).filter(Boolean)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo ciclo de avaliação</DialogTitle>
          <div className="pt-2">
            <StepIndicator current={step} />
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ── Step 1 ── */}
          {step === 1 && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Nome do ciclo</Label>
                <Input placeholder="Ex: Avaliação Semestral 2025.1" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Template de avaliação</Label>
                <Controller
                  control={control}
                  name="templateId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activeTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                            <span className="ml-2 text-xs text-muted-foreground">v{t.version}</span>
                          </SelectItem>
                        ))}
                        {activeTemplates.length === 0 && (
                          <div className="py-2 px-3 text-sm text-muted-foreground">
                            Nenhum template ativo
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.templateId && <p className="text-sm text-destructive">{errors.templateId.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Data de início</Label>
                  <Input type="date" {...register('startAt')} />
                  {errors.startAt && <p className="text-sm text-destructive">{errors.startAt.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Data de fim</Label>
                  <Input type="date" {...register('endAt')} />
                  {errors.endAt && <p className="text-sm text-destructive">{errors.endAt.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Prazo padrão das avaliações</Label>
                <Input type="date" {...register('defaultDueAt')} />
                <p className="text-xs text-muted-foreground">Aplicado a cada avaliado (pode ser ajustado individualmente)</p>
                {errors.defaultDueAt && <p className="text-sm text-destructive">{errors.defaultDueAt.message}</p>}
              </div>
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Avaliados e tipos de avaliação</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure quem será avaliado e por quem
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8" onClick={addGroup}>
                  <Users className="h-4 w-4" />
                  Adicionar avaliado
                </Button>
              </div>

              {groups.length === 0 ? (
                <div className="rounded-lg border border-dashed flex flex-col items-center py-10 gap-2">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nenhum avaliado adicionado</p>
                  <Button type="button" variant="ghost" size="sm" onClick={addGroup}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar primeiro avaliado
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map((g) => (
                    <ParticipantGroupRow
                      key={g.localId}
                      group={g}
                      employees={employees}
                      onChange={(updated) => updateGroup(g.localId, updated)}
                      onRemove={() => removeGroup(g.localId)}
                      usedEmployeeIds={usedEmployeeIds}
                    />
                  ))}
                </div>
              )}

              {step2Error && <p className="text-sm text-destructive">{step2Error}</p>}

              {/* Summary */}
              {groups.filter((g) => g.revieweeEmployeeId).length > 0 && (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  {expandGroups(groups.filter((g) => g.revieweeEmployeeId), employees).length} avaliações geradas
                  para {groups.filter((g) => g.revieweeEmployeeId).length} avaliado(s)
                </div>
              )}
            </div>
          )}

          <Separator className="my-4" />

          <DialogFooter className="gap-2">
            {step === 1 ? (
              <>
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="button" onClick={goToStep2} className="gap-1">
                  Próximo <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button type="submit" disabled={createCycle.isPending}>
                  {createCycle.isPending ? 'Criando...' : 'Criar ciclo'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
