import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { employeeIdParamSchema, cycleQuerySchema } from '@reviews360/zod-schemas'
import { z } from 'zod'
import { ReportService } from '../services/report.service.js'

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  const svc = new ReportService(app)

  app.withTypeProvider<ZodTypeProvider>().get('/employee/:employeeId', {
    preHandler: [app.authenticate],
    schema: {
      params: employeeIdParamSchema,
      querystring: cycleQuerySchema,
    },
    handler: async (req, reply) => {
      const report = await svc.getEmployeeReport(req.params.employeeId, req.query.cycle_id, req.user)
      return reply.send(report)
    },
  })

  app.withTypeProvider<ZodTypeProvider>().get('/team/:id', {
    preHandler: [app.authorize('admin', 'manager')],
    schema: {
      params: z.object({ id: z.string().cuid() }),
      querystring: cycleQuerySchema,
    },
    handler: async (req, reply) => {
      const report = await svc.getTeamReport(req.params.id, req.query.cycle_id, req.user)
      return reply.send(report)
    },
  })
}
