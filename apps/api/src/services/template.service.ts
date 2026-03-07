import type { FastifyInstance } from 'fastify'
import type { z } from 'zod'
import type { createTemplateSchema, updateTemplateSchema, paginationSchema } from '@reviews360/zod-schemas'
import type { PaginatedResult, ReviewTemplateDto } from '@reviews360/types'
import { prisma } from '../lib/prisma.js'

type CreateInput = z.infer<typeof createTemplateSchema>
type UpdateInput = z.infer<typeof updateTemplateSchema>
type Pagination = z.infer<typeof paginationSchema>

export class TemplateService {
  constructor(private readonly app: FastifyInstance) {}

  async create(input: CreateInput): Promise<ReviewTemplateDto> {
    const template = await prisma.reviewTemplate.create({
      data: {
        name: input.name,
        sections: {
          create: input.sections.map((s) => ({
            title: s.title,
            order: s.order,
            questions: {
              create: s.questions.map((q) => ({
                type: q.type,
                text: q.text,
                scaleMin: q.scaleMin ?? null,
                scaleMax: q.scaleMax ?? null,
                required: q.required,
                order: q.order,
              })),
            },
          })),
        },
      },
      include: { sections: { include: { questions: true }, orderBy: { order: 'asc' } } },
    })
    return template as unknown as ReviewTemplateDto
  }

  async findAll(pagination: Pagination): Promise<PaginatedResult<ReviewTemplateDto>> {
    const [data, total] = await prisma.$transaction([
      prisma.reviewTemplate.findMany({
        take: pagination.take,
        skip: pagination.skip,
        orderBy: { createdAt: 'desc' },
        include: { sections: { include: { questions: true }, orderBy: { order: 'asc' } } },
      }),
      prisma.reviewTemplate.count(),
    ])
    return { data: data as unknown as ReviewTemplateDto[], total, take: pagination.take, skip: pagination.skip }
  }

  async findById(id: string): Promise<ReviewTemplateDto> {
    const template = await prisma.reviewTemplate.findUnique({
      where: { id },
      include: { sections: { include: { questions: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } },
    })
    if (!template) throw this.app.httpErrors.notFound('Template not found')
    return template as unknown as ReviewTemplateDto
  }

  async update(id: string, input: UpdateInput): Promise<ReviewTemplateDto> {
    const existing = await prisma.reviewTemplate.findUnique({
      where: { id },
      include: { cycles: { where: { status: { not: 'draft' } }, take: 1 } },
    })
    if (!existing) throw this.app.httpErrors.notFound('Template not found')
    if (existing.cycles.length > 0) {
      throw this.app.httpErrors.conflict('Cannot edit a template linked to an active cycle')
    }

    const template = await prisma.reviewTemplate.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        version: { increment: 1 },
      },
      include: { sections: { include: { questions: true }, orderBy: { order: 'asc' } } },
    })
    return template as unknown as ReviewTemplateDto
  }
}
