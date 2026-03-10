import type { FastifyInstance } from 'fastify'
import type { z } from 'zod'
import type { createTemplateSchema, updateTemplateSchema, paginationSchema, toggleActiveSchema } from '@reviews360/zod-schemas'
import type { PaginatedResult, ReviewTemplateDto } from '@reviews360/types'
import { prisma } from '../lib/prisma.js'

type CreateInput = z.infer<typeof createTemplateSchema>
type UpdateInput = z.infer<typeof updateTemplateSchema>
type Pagination = z.infer<typeof paginationSchema>
type ToggleActiveInput = z.infer<typeof toggleActiveSchema>

const INCLUDE_FULL = {
  sections: {
    include: { questions: { orderBy: { order: 'asc' as const } } },
    orderBy: { order: 'asc' as const },
  },
}

export class TemplateService {
  constructor(private readonly app: FastifyInstance) {}

  async create(input: CreateInput): Promise<ReviewTemplateDto> {
    const template = await prisma.reviewTemplate.create({
      data: {
        name: input.name,
        sections: {
          create: input.sections.map((s, si) => ({
            title: s.title,
            order: s.order ?? si,
            questions: {
              create: s.questions.map((q, qi) => ({
                type: q.type,
                text: q.text,
                scaleMin: q.scaleMin ?? null,
                scaleMax: q.scaleMax ?? null,
                options: q.options ? JSON.stringify(q.options) : null,
                required: q.required,
                order: q.order ?? qi,
              })),
            },
          })),
        },
      },
      include: INCLUDE_FULL,
    })
    return this.mapTemplate(template)
  }

  async findAll(pagination: Pagination): Promise<PaginatedResult<ReviewTemplateDto>> {
    const [data, total] = await prisma.$transaction([
      prisma.reviewTemplate.findMany({
        take: pagination.take,
        skip: pagination.skip,
        orderBy: { createdAt: 'desc' },
        include: INCLUDE_FULL,
      }),
      prisma.reviewTemplate.count(),
    ])
    return { data: data.map(this.mapTemplate), total, take: pagination.take, skip: pagination.skip }
  }

  async findById(id: string): Promise<ReviewTemplateDto> {
    const template = await prisma.reviewTemplate.findUnique({ where: { id }, include: INCLUDE_FULL })
    if (!template) throw this.app.httpErrors.notFound('Template not found')
    return this.mapTemplate(template)
  }

  async update(id: string, input: UpdateInput): Promise<ReviewTemplateDto> {
    const existing = await prisma.reviewTemplate.findUnique({
      where: { id },
      include: { cycles: { where: { status: { not: 'draft' } }, take: 1 } },
    })
    if (!existing) throw this.app.httpErrors.notFound('Template not found')
    if (existing.cycles.length > 0) {
      throw this.app.httpErrors.conflict('Cannot edit a template linked to an active or published cycle')
    }

    const template = await prisma.$transaction(async (tx) => {
      if (input.sections) {
        await tx.templateSection.deleteMany({ where: { templateId: id } })
        await Promise.all(
          input.sections.map((s, si) =>
            tx.templateSection.create({
              data: {
                templateId: id,
                title: s.title,
                order: s.order ?? si,
                questions: {
                  create: s.questions.map((q, qi) => ({
                    type: q.type,
                    text: q.text,
                    scaleMin: q.scaleMin ?? null,
                    scaleMax: q.scaleMax ?? null,
                    options: q.options ? JSON.stringify(q.options) : null,
                    required: q.required,
                    order: q.order ?? qi,
                  })),
                },
              },
            })
          )
        )
      }

      return tx.reviewTemplate.update({
        where: { id },
        data: {
          ...(input.name && { name: input.name }),
          version: { increment: 1 },
        },
        include: INCLUDE_FULL,
      })
    })

    return this.mapTemplate(template)
  }

  async toggleActive(id: string, input: ToggleActiveInput): Promise<ReviewTemplateDto> {
    const existing = await prisma.reviewTemplate.findUnique({ where: { id } })
    if (!existing) throw this.app.httpErrors.notFound('Template not found')

    const template = await prisma.reviewTemplate.update({
      where: { id },
      data: { isActive: input.isActive },
      include: INCLUDE_FULL,
    })
    return this.mapTemplate(template)
  }

  private mapTemplate(t: {
    id: string
    name: string
    version: number
    isActive: boolean
    createdAt: Date
    sections: Array<{
      id: string
      templateId: string
      title: string
      order: number
      questions: Array<{
        id: string
        sectionId: string
        type: string
        text: string
        scaleMin: number | null
        scaleMax: number | null
        options: string | null
        required: boolean
        order: number
      }>
    }>
  }): ReviewTemplateDto {
    return {
      id: t.id,
      name: t.name,
      version: t.version,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
      sections: t.sections.map((s) => ({
        id: s.id,
        templateId: s.templateId,
        title: s.title,
        order: s.order,
        questions: s.questions.map((q) => ({
          id: q.id,
          sectionId: q.sectionId,
          type: q.type as ReviewTemplateDto['sections'][0]['questions'][0]['type'],
          text: q.text,
          scaleMin: q.scaleMin,
          scaleMax: q.scaleMax,
          options: q.options ? (JSON.parse(q.options) as string[]) : null,
          required: q.required,
          order: q.order,
        })),
      })),
    }
  }
}
