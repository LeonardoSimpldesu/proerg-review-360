import type { FastifyInstance } from 'fastify'
import type { z } from 'zod'
import type { saveResponseSchema, assignmentStatusQuerySchema } from '@reviews360/zod-schemas'
import type { JwtPayload, ReviewResponseDto, AssignmentDetailDto, ReviewAssignmentWithNamesDto, PaginatedResult } from '@reviews360/types'
import { prisma } from '../lib/prisma.js'

type SaveInput = z.infer<typeof saveResponseSchema>
type AssignmentQuery = z.infer<typeof assignmentStatusQuerySchema>

const INCLUDE_TEMPLATE_FULL = {
  sections: {
    orderBy: { order: 'asc' as const },
    include: { questions: { orderBy: { order: 'asc' as const } } },
  },
}

export class AssignmentService {
  constructor(private readonly app: FastifyInstance) {}

  async findMyAssignments(actor: JwtPayload, query: AssignmentQuery): Promise<PaginatedResult<ReviewAssignmentWithNamesDto>> {
    if (!actor.employeeId) return { data: [], total: 0, take: query.take, skip: query.skip }

    const where = {
      reviewerEmployeeId: actor.employeeId,
      ...(query.status ? { status: query.status } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.reviewAssignment.findMany({
        where,
        take: query.take,
        skip: query.skip,
        orderBy: { dueAt: 'asc' },
        include: {
          reviewee: { include: { user: true } },
          reviewer: { include: { user: true } },
        },
      }),
      prisma.reviewAssignment.count({ where }),
    ])

    return {
      data: items.map((a) => ({
        id: a.id,
        cycleId: a.cycleId,
        reviewerEmployeeId: a.reviewerEmployeeId,
        revieweeEmployeeId: a.revieweeEmployeeId,
        role: a.role as ReviewAssignmentWithNamesDto['role'],
        isAnonymous: a.isAnonymous,
        status: a.status as ReviewAssignmentWithNamesDto['status'],
        dueAt: a.dueAt.toISOString(),
        revieweeName: a.reviewee.user.name,
        reviewerName: a.reviewer.user.name,
      })),
      total,
      take: query.take,
      skip: query.skip,
    }
  }

  async findById(assignmentId: string, actor: JwtPayload): Promise<AssignmentDetailDto> {
    if (!actor.employeeId) throw this.app.httpErrors.notFound('Assignment not found')

    const a = await prisma.reviewAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        reviewee: { include: { user: true } },
        cycle: {
          include: {
            template: { include: { sections: { include: { questions: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } } },
          },
        },
        response: { include: { answers: true } },
      },
    })

    if (!a) throw this.app.httpErrors.notFound('Assignment not found')
    if (a.reviewerEmployeeId !== actor.employeeId) throw this.app.httpErrors.forbidden('Access denied')

    return {
      id: a.id,
      cycleId: a.cycleId,
      cycleName: a.cycle.name,
      role: a.role as AssignmentDetailDto['role'],
      isAnonymous: a.isAnonymous,
      status: a.status as AssignmentDetailDto['status'],
      dueAt: a.dueAt.toISOString(),
      revieweeName: a.reviewee.user.name,
      template: {
        id: a.cycle.template.id,
        name: a.cycle.template.name,
        version: a.cycle.template.version,
        isActive: a.cycle.template.isActive,
        createdAt: a.cycle.template.createdAt.toISOString(),
        sections: a.cycle.template.sections.map((s) => ({
          id: s.id,
          templateId: s.templateId,
          title: s.title,
          order: s.order,
          questions: s.questions.map((q) => ({
            id: q.id,
            sectionId: q.sectionId,
            type: q.type as AssignmentDetailDto['template']['sections'][0]['questions'][0]['type'],
            text: q.text,
            scaleMin: q.scaleMin,
            scaleMax: q.scaleMax,
            required: q.required,
            order: q.order,
          })),
        })),
      },
      response: a.response
        ? {
            id: a.response.id,
            assignmentId: a.response.assignmentId,
            submittedAt: a.response.submittedAt?.toISOString() ?? null,
            overallComment: a.response.overallComment,
            isDraft: a.response.isDraft,
            answers: a.response.answers.map((ans) => ({
              id: ans.id,
              questionId: ans.questionId,
              ratingValue: ans.ratingValue,
              textValue: ans.textValue,
            })),
          }
        : null,
    }
  }

  private async assertOwnership(assignmentId: string, actor: JwtPayload): Promise<void> {
    const assignment = await prisma.reviewAssignment.findUnique({ where: { id: assignmentId } })
    if (!assignment) throw this.app.httpErrors.notFound('Assignment not found')
    if (actor.employeeId !== assignment.reviewerEmployeeId) {
      throw this.app.httpErrors.forbidden('You are not the reviewer for this assignment')
    }
    if (assignment.status === 'completed') {
      throw this.app.httpErrors.conflict('Assignment already submitted')
    }
  }

  private async validateAnswersScale(assignmentId: string, answers: SaveInput['answers']): Promise<void> {
    const assignment = await prisma.reviewAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        cycle: {
          include: {
            template: {
              include: { sections: { include: { questions: true } } },
            },
          },
        },
      },
    })
    if (!assignment) return

    const questions = assignment.cycle.template.sections.flatMap((s) => s.questions)
    for (const answer of answers) {
      if (answer.ratingValue == null) continue
      const question = questions.find((q) => q.id === answer.questionId)
      if (!question) continue
      const min = question.scaleMin ?? 1
      const max = question.scaleMax ?? 5
      if (answer.ratingValue < min || answer.ratingValue > max) {
        throw this.app.httpErrors.badRequest(
          `Rating for question "${question.text}" must be between ${min} and ${max}`
        )
      }
    }
  }

  async saveDraft(assignmentId: string, input: SaveInput, actor: JwtPayload): Promise<ReviewResponseDto> {
    await this.assertOwnership(assignmentId, actor)
    await this.validateAnswersScale(assignmentId, input.answers)

    const response = await prisma.$transaction(async (tx) => {
      const existing = await tx.reviewResponse.findUnique({ where: { assignmentId } })

      if (existing) {
        // Delete old answers and recreate
        await tx.responseAnswer.deleteMany({ where: { responseId: existing.id } })
        return tx.reviewResponse.update({
          where: { id: existing.id },
          data: {
            overallComment: input.overallComment ?? null,
            isDraft: true,
            answers: {
              create: input.answers.map((a) => ({
                questionId: a.questionId,
                ratingValue: a.ratingValue ?? null,
                textValue: a.textValue ?? null,
              })),
            },
          },
          include: { answers: true },
        })
      }

      return tx.reviewResponse.create({
        data: {
          assignmentId,
          overallComment: input.overallComment ?? null,
          isDraft: true,
          answers: {
            create: input.answers.map((a) => ({
              questionId: a.questionId,
              ratingValue: a.ratingValue ?? null,
              textValue: a.textValue ?? null,
            })),
          },
        },
        include: { answers: true },
      })
    })

    // Update assignment status to in_progress
    await prisma.reviewAssignment.update({
      where: { id: assignmentId },
      data: { status: 'in_progress' },
    })

    return response as unknown as ReviewResponseDto
  }

  async submit(assignmentId: string, input: SaveInput, actor: JwtPayload): Promise<ReviewResponseDto> {
    await this.assertOwnership(assignmentId, actor)
    await this.validateAnswersScale(assignmentId, input.answers)

    const response = await prisma.$transaction(async (tx) => {
      const existing = await tx.reviewResponse.findUnique({ where: { assignmentId } })

      if (existing) {
        await tx.responseAnswer.deleteMany({ where: { responseId: existing.id } })
        return tx.reviewResponse.update({
          where: { id: existing.id },
          data: {
            overallComment: input.overallComment ?? null,
            isDraft: false,
            submittedAt: new Date(),
            answers: {
              create: input.answers.map((a) => ({
                questionId: a.questionId,
                ratingValue: a.ratingValue ?? null,
                textValue: a.textValue ?? null,
              })),
            },
          },
          include: { answers: true },
        })
      }

      return tx.reviewResponse.create({
        data: {
          assignmentId,
          overallComment: input.overallComment ?? null,
          isDraft: false,
          submittedAt: new Date(),
          answers: {
            create: input.answers.map((a) => ({
              questionId: a.questionId,
              ratingValue: a.ratingValue ?? null,
              textValue: a.textValue ?? null,
            })),
          },
        },
        include: { answers: true },
      })
    })

    await prisma.reviewAssignment.update({
      where: { id: assignmentId },
      data: { status: 'completed' },
    })

    await this.app.audit({
      actorId: actor.sub,
      action: 'assignment.submitted',
      entity: 'ReviewAssignment',
      entityId: assignmentId,
    })

    return response as unknown as ReviewResponseDto
  }
}
