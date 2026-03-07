import type { FastifyInstance } from 'fastify'
import type { JwtPayload, EmployeeReportDto, CompetencyScore } from '@reviews360/types'
import { prisma } from '../lib/prisma.js'

export class ReportService {
  constructor(private readonly app: FastifyInstance) {}

  async getEmployeeReport(
    employeeId: string,
    cycleId: string | undefined,
    actor: JwtPayload
  ): Promise<EmployeeReportDto> {
    if (actor.role === 'employee' && actor.employeeId !== employeeId) {
      throw this.app.httpErrors.forbidden('Access denied')
    }

    const cycleFilter = actor.role === 'employee' ? { status: 'published' } : undefined

    const assignments = await prisma.reviewAssignment.findMany({
      where: {
        revieweeEmployeeId: employeeId,
        status: 'completed',
        response: { isDraft: false },
        ...(cycleId && { cycleId }),
        ...(cycleFilter && { cycle: cycleFilter }),
      },
      include: {
        response: { include: { answers: true } },
        cycle: {
          include: {
            template: {
              include: {
                sections: {
                  include: { questions: true },
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    await this.app.audit({
      actorId: actor.sub,
      action: 'report.accessed',
      entity: 'Employee',
      entityId: employeeId,
      metadata: { cycleId },
    })

    return this.buildEmployeeReport(employeeId, cycleId ?? 'all', assignments)
  }

  private buildEmployeeReport(
    employeeId: string,
    cycleId: string,
    assignments: Array<{
      role: string
      response: { overallComment: string | null; answers: Array<{ questionId: string; ratingValue: number | null }> } | null
      cycle: { template: { sections: Array<{ title: string; questions: Array<{ id: string; type: string }> }> } }
    }>
  ): EmployeeReportDto {
    const sectionMap = new Map<string, { ratings: number[]; selfRatings: number[]; managerRatings: number[] }>()
    const overallComments: string[] = []

    for (const assignment of assignments) {
      if (!assignment.response) continue
      if (assignment.response.overallComment) {
        overallComments.push(assignment.response.overallComment)
      }

      for (const section of assignment.cycle.template.sections) {
        if (!sectionMap.has(section.title)) {
          sectionMap.set(section.title, { ratings: [], selfRatings: [], managerRatings: [] })
        }
        const bucket = sectionMap.get(section.title)!

        for (const question of section.questions) {
          if (question.type !== 'rating') continue
          const answer = assignment.response.answers.find((a) => a.questionId === question.id)
          if (answer?.ratingValue == null) continue

          bucket.ratings.push(answer.ratingValue)
          if (assignment.role === 'self') bucket.selfRatings.push(answer.ratingValue)
          if (assignment.role === 'manager') bucket.managerRatings.push(answer.ratingValue)
        }
      }
    }

    const avg = (arr: number[]): number =>
      arr.length === 0 ? 0 : Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2))

    const competencies: CompetencyScore[] = Array.from(sectionMap.entries()).map(([title, data]) => ({
      sectionTitle: title,
      averageRating: avg(data.ratings),
      selfRating: data.selfRatings.length > 0 ? avg(data.selfRatings) : null,
      managerRating: data.managerRatings.length > 0 ? avg(data.managerRatings) : null,
    }))

    return { employeeId, cycleId, competencies, overallComments }
  }

  async getTeamReport(
    teamId: string,
    cycleId: string | undefined,
    actor: JwtPayload
  ): Promise<{ teamId: string; members: EmployeeReportDto[] }> {
    if (actor.role === 'manager' && actor.employeeId) {
      const manager = await prisma.employee.findUnique({
        where: { id: actor.employeeId },
        select: { teamId: true },
      })
      if (manager?.teamId !== teamId) {
        throw this.app.httpErrors.forbidden('Access denied to this team')
      }
    }

    const members = await prisma.employee.findMany({
      where: { teamId },
      select: { id: true },
    })

    const reports = await Promise.all(
      members.map((m) => this.getEmployeeReport(m.id, cycleId, actor))
    )

    return { teamId, members: reports }
  }
}
