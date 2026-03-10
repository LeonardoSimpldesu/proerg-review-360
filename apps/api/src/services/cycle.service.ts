import type { FastifyInstance } from 'fastify'
import type { z } from 'zod'
import type { createCycleSchema, paginationSchema, assignmentStatusQuerySchema } from '@reviews360/zod-schemas'
import type { JwtPayload, PaginatedResult, ReviewCycleDetailDto, ReviewAssignmentWithNamesDto } from '@reviews360/types'
import { prisma } from '../lib/prisma.js'

type CreateInput = z.infer<typeof createCycleSchema>
type Pagination = z.infer<typeof paginationSchema>
type AssignmentQuery = z.infer<typeof assignmentStatusQuerySchema>

export class CycleService {
  constructor(private readonly app: FastifyInstance) {}

  async create(input: CreateInput, actorId: string): Promise<ReviewCycleDetailDto> {
    const template = await prisma.reviewTemplate.findUnique({ where: { id: input.templateId } })
    if (!template) throw this.app.httpErrors.notFound('Template not found')

    const cycle = await prisma.$transaction(async (tx) => {
      const c = await tx.reviewCycle.create({
        data: {
          name: input.name,
          templateId: input.templateId,
          startAt: new Date(input.startAt),
          endAt: new Date(input.endAt),
        },
      })

      await tx.reviewAssignment.createMany({
        data: input.participants.map((p) => ({
          cycleId: c.id,
          reviewerEmployeeId: p.reviewerEmployeeId,
          revieweeEmployeeId: p.revieweeEmployeeId,
          role: p.role,
          isAnonymous: p.isAnonymous,
          dueAt: new Date(p.dueAt),
        })),
      })

      return c
    })

    await this.app.audit({
      actorId,
      action: 'cycle.created',
      entity: 'ReviewCycle',
      entityId: cycle.id,
    })

    return this.findById(cycle.id)
  }

  async findAll(pagination: Pagination): Promise<PaginatedResult<ReviewCycleDetailDto>> {
    const [data, total] = await prisma.$transaction([
      prisma.reviewCycle.findMany({
        take: pagination.take,
        skip: pagination.skip,
        orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { id: true, name: true, version: true } },
          _count: { select: { assignments: true } },
        },
      }),
      prisma.reviewCycle.count(),
    ])
    return { data: data as unknown as ReviewCycleDetailDto[], total, take: pagination.take, skip: pagination.skip }
  }

  async findById(id: string): Promise<ReviewCycleDetailDto> {
    const cycle = await prisma.reviewCycle.findUnique({
      where: { id },
      include: {
        template: { select: { id: true, name: true, version: true } },
        _count: { select: { assignments: true } },
      },
    })
    if (!cycle) throw this.app.httpErrors.notFound('Cycle not found')
    return cycle as unknown as ReviewCycleDetailDto
  }

  async activate(id: string, actorId: string): Promise<ReviewCycleDetailDto> {
    const cycle = await prisma.reviewCycle.findUnique({ where: { id } })
    if (!cycle) throw this.app.httpErrors.notFound('Cycle not found')
    if (cycle.status !== 'draft') {
      throw this.app.httpErrors.conflict('Only draft cycles can be activated')
    }

    await prisma.reviewCycle.update({ where: { id }, data: { status: 'active' } })
    await this.app.audit({ actorId, action: 'cycle.activated', entity: 'ReviewCycle', entityId: id })
    return this.findById(id)
  }

  async close(id: string, actorId: string): Promise<ReviewCycleDetailDto> {
    const cycle = await prisma.reviewCycle.findUnique({ where: { id } })
    if (!cycle) throw this.app.httpErrors.notFound('Cycle not found')
    if (cycle.status !== 'active') {
      throw this.app.httpErrors.conflict('Only active cycles can be closed')
    }

    await prisma.reviewCycle.update({ where: { id }, data: { status: 'closed' } })
    await this.app.audit({ actorId, action: 'cycle.closed', entity: 'ReviewCycle', entityId: id })
    return this.findById(id)
  }

  async publish(id: string, actorId: string): Promise<ReviewCycleDetailDto> {
    const cycle = await prisma.reviewCycle.findUnique({ where: { id } })
    if (!cycle) throw this.app.httpErrors.notFound('Cycle not found')
    if (cycle.status !== 'closed') {
      throw this.app.httpErrors.conflict('Only closed cycles can be published')
    }

    await prisma.reviewCycle.update({ where: { id }, data: { status: 'published' } })
    await this.app.audit({ actorId, action: 'cycle.published', entity: 'ReviewCycle', entityId: id })
    return this.findById(id)
  }

  async getAssignments(
    cycleId: string,
    query: AssignmentQuery,
    actor: JwtPayload
  ): Promise<PaginatedResult<ReviewAssignmentWithNamesDto>> {
    const where: Record<string, unknown> = {
      cycleId,
      ...(query.status && { status: query.status }),
    }

    if (actor.role === 'employee' && actor.employeeId) {
      where['reviewerEmployeeId'] = actor.employeeId
    } else if (actor.role === 'manager' && actor.employeeId) {
      const reports = await prisma.employee.findMany({
        where: { managerId: actor.employeeId },
        select: { id: true },
      })
      where['revieweeEmployeeId'] = { in: reports.map((r) => r.id) }
    }

    const INCLUDE_NAMES = {
      reviewer: { include: { user: { select: { name: true } } } },
      reviewee: { include: { user: { select: { name: true } } } },
    }

    const [raw, total] = await prisma.$transaction([
      prisma.reviewAssignment.findMany({
        where,
        take: query.take,
        skip: query.skip,
        orderBy: { dueAt: 'asc' },
        include: INCLUDE_NAMES,
      }),
      prisma.reviewAssignment.count({ where }),
    ])

    const data: ReviewAssignmentWithNamesDto[] = raw.map((a) => ({
      id: a.id,
      cycleId: a.cycleId,
      reviewerEmployeeId: a.isAnonymous && actor.role !== 'admin' ? '' : a.reviewerEmployeeId,
      revieweeEmployeeId: a.revieweeEmployeeId,
      role: a.role as ReviewAssignmentWithNamesDto['role'],
      isAnonymous: a.isAnonymous,
      status: a.status as ReviewAssignmentWithNamesDto['status'],
      dueAt: a.dueAt.toISOString(),
      reviewerName: a.isAnonymous && actor.role !== 'admin' ? null : a.reviewer.user.name,
      revieweeName: a.reviewee.user.name,
    }))

    return { data, total, take: query.take, skip: query.skip }
  }
}
