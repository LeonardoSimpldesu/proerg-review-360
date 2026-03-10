import type { FastifyInstance } from 'fastify'
import type { EmployeeWithUserDto, PaginatedResult } from '@reviews360/types'
import { prisma } from '../lib/prisma.js'

const INCLUDE_USER = {
  user: { select: { id: true, name: true, email: true } },
} as const

export class EmployeeService {
  constructor(private readonly app: FastifyInstance) {}

  async findAll(params: { take: number; skip: number }): Promise<PaginatedResult<EmployeeWithUserDto>> {
    const [data, total] = await prisma.$transaction([
      prisma.employee.findMany({
        take: params.take,
        skip: params.skip,
        orderBy: { user: { name: 'asc' } },
        include: INCLUDE_USER,
      }),
      prisma.employee.count(),
    ])
    return { data: data as unknown as EmployeeWithUserDto[], total, take: params.take, skip: params.skip }
  }

  async findById(id: string): Promise<EmployeeWithUserDto> {
    const emp = await prisma.employee.findUnique({ where: { id }, include: INCLUDE_USER })
    if (!emp) throw this.app.httpErrors.notFound('Employee not found')
    return emp as unknown as EmployeeWithUserDto
  }
}
