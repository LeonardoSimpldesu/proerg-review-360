import type { FastifyInstance } from 'fastify'
import type { z } from 'zod'
import type { saveResponseSchema } from '@reviews360/zod-schemas'
import type { JwtPayload, ReviewResponseDto } from '@reviews360/types'
import { prisma } from '../lib/prisma.js'

type SaveInput = z.infer<typeof saveResponseSchema>

export class AssignmentService {
  constructor(private readonly app: FastifyInstance) {}

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

  async saveDraft(assignmentId: string, input: SaveInput, actor: JwtPayload): Promise<ReviewResponseDto> {
    await this.assertOwnership(assignmentId, actor)

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
