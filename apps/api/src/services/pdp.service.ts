import type { FastifyInstance } from 'fastify'
import type { z } from 'zod'
import type { createPdpSchema, updatePdpSchema } from '@reviews360/zod-schemas'
import type { JwtPayload, DevelopmentPlanDto } from '@reviews360/types'
import { prisma } from '../lib/prisma.js'

type CreateInput = z.infer<typeof createPdpSchema>
type UpdateInput = z.infer<typeof updatePdpSchema>

export class PdpService {
  constructor(private readonly app: FastifyInstance) {}

  async create(input: CreateInput, actor: JwtPayload): Promise<DevelopmentPlanDto> {
    const managerEmployee = actor.employeeId
      ? await prisma.employee.findUnique({ where: { id: actor.employeeId } })
      : null

    if (actor.role === 'manager' && managerEmployee) {
      const isReport = await prisma.employee.findFirst({
        where: { id: input.employeeId, managerId: managerEmployee.id },
      })
      if (!isReport) throw this.app.httpErrors.forbidden('Employee is not in your team')
    }

    const plan = await prisma.developmentPlan.create({
      data: {
        cycleId: input.cycleId,
        employeeId: input.employeeId,
        ownerManagerId: actor.employeeId!,
        goals: {
          create: input.goals.map((g) => ({
            text: g.text,
            dueAt: g.dueAt ? new Date(g.dueAt) : null,
          })),
        },
      },
      include: { goals: true },
    })

    await this.app.audit({
      actorId: actor.sub,
      action: 'pdp.created',
      entity: 'DevelopmentPlan',
      entityId: plan.id,
    })

    return plan as unknown as DevelopmentPlanDto
  }

  async update(id: string, input: UpdateInput, actor: JwtPayload): Promise<DevelopmentPlanDto> {
    const plan = await prisma.developmentPlan.findUnique({ where: { id } })
    if (!plan) throw this.app.httpErrors.notFound('PDP not found')

    if (actor.role === 'manager' && actor.employeeId !== plan.ownerManagerId) {
      throw this.app.httpErrors.forbidden('You are not the owner of this PDP')
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.developmentGoal.deleteMany({ where: { planId: id } })
      return tx.developmentPlan.update({
        where: { id },
        data: {
          goals: {
            create: input.goals.map((g) => ({
              text: g.text,
              dueAt: g.dueAt ? new Date(g.dueAt) : null,
              status: g.status,
            })),
          },
        },
        include: { goals: true },
      })
    })

    await this.app.audit({
      actorId: actor.sub,
      action: 'pdp.updated',
      entity: 'DevelopmentPlan',
      entityId: id,
    })

    return updated as unknown as DevelopmentPlanDto
  }

  async findByEmployee(employeeId: string, actor: JwtPayload): Promise<DevelopmentPlanDto[]> {
    if (actor.role === 'employee' && actor.employeeId !== employeeId) {
      throw this.app.httpErrors.forbidden('Access denied')
    }

    const plans = await prisma.developmentPlan.findMany({
      where: { employeeId },
      include: { goals: { orderBy: { status: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return plans as unknown as DevelopmentPlanDto[]
  }
}
